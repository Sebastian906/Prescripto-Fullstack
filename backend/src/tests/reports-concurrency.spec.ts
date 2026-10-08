import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { ReportsService, GLOBAL_DOC_ID } from 'src/reports/reports.service';
import { MonthlyStats } from 'src/reports/schemas/monthly-stats.schema';
import { MonthlyStatsPatient } from 'src/reports/schemas/monthly-stats-patient.schema';

type Appt = { docId: string; userId: string; amount: number; date: number; isCompleted: boolean; payment: boolean; cancelled: boolean };

// Harness fiel al contrato atómico (igual que reports-spill.spec.ts).
function buildHarness() {
    type Bucket = { total: number; completed: number; cancelled: number; earnings: number; inline: string[]; unique: number };
    const buckets = new Map<string, Bucket>();
    const spills = new Map<string, Set<string>>();
    const keyOf = (f: { docId: string; year: number; month: number }) => `${f.docId}|${f.year}|${f.month}`;
    const MAX = 5000;
    const dup = () => { const e = new Error('duplicate key') as Error & { code: number }; e.code = 11000; return e; };
    const statsModel: any = {
        find: jest.fn().mockImplementation((q: { docId: string; year: number }) => ({
            sort: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(
                    [...buckets.entries()].filter(([k]) => k.startsWith(`${q.docId}|${q.year}|`)).map(([k, b]) => {
                        const [, y, m] = k.split('|');
                        return { docId: q.docId, year: Number(y), month: Number(m), totalAppointments: b.total, completedAppointments: b.completed, cancelledAppointments: b.cancelled, earnings: b.earnings, uniquePatients: b.unique };
                    }),
                ),
            }),
        })),
        findOne: jest.fn().mockImplementation((f: any) => ({
            select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(buckets.has(keyOf(f)) ? { uniquePatientIds: [...buckets.get(keyOf(f))!.inline] } : null) }),
        })),
        updateOne: jest.fn().mockImplementation((f: any, u: any, o?: { upsert?: boolean }) => {
            const k = keyOf(f);
            let b = buckets.get(k);
            const ne = f?.uniquePatientIds?.$ne as string | undefined;
            if (ne !== undefined && b && b.inline.includes(ne)) {
                if (o?.upsert) return Promise.reject(dup());
                return Promise.resolve({ modifiedCount: 0, matchedCount: 1, acknowledged: true });
            }
            if (!b && !o?.upsert) return Promise.resolve({ modifiedCount: 0, matchedCount: 0, acknowledged: true });
            if (!b) { b = { total: 0, completed: 0, cancelled: 0, earnings: 0, inline: [], unique: 0 }; buckets.set(k, b); }
            if (u.$addToSet?.uniquePatientIds && !b.inline.includes(u.$addToSet.uniquePatientIds) && b.inline.length < MAX) b.inline.push(u.$addToSet.uniquePatientIds);
            if (u.$inc?.uniquePatients) b.unique += u.$inc.uniquePatients;
            if (u.$inc?.totalAppointments) b.total += u.$inc.totalAppointments;
            if (u.$inc?.completedAppointments) b.completed += u.$inc.completedAppointments;
            if (u.$inc?.cancelledAppointments) b.cancelled += u.$inc.cancelledAppointments;
            if (u.$inc?.earnings) b.earnings += u.$inc.earnings;
            return Promise.resolve({ modifiedCount: 1, matchedCount: 1, acknowledged: true });
        }),
        bulkWrite: jest.fn().mockResolvedValue({ upsertedCount: 0, modifiedCount: 0 }),
    };
    const spillModel: any = {
        exists: jest.fn().mockImplementation((q: any) => ({ exec: () => Promise.resolve((spills.get(keyOf(q)) ?? new Set()).has(q.patientId) ? { _id: 'x' } : null) })),
        create: jest.fn().mockImplementation((d: any) => {
            const s = spills.get(keyOf(d)) ?? new Set<string>();
            spills.set(keyOf(d), s);
            if (s.has(d.patientId)) return Promise.reject(dup());
            s.add(d.patientId);
            return Promise.resolve(d);
        }),
        countDocuments: jest.fn().mockReturnValue({ exec: () => Promise.resolve(0) }),
        deleteOne: jest.fn().mockReturnValue({ exec: () => Promise.resolve({ deletedCount: 0 }) }),
        bulkWrite: jest.fn().mockResolvedValue({ upsertedCount: 0 }),
    };
    const connection = { collection: jest.fn() };
    return { statsModel, spillModel, connection };
}

describe('ReportsService concurrency (50 bookings)', () => {
    it('50 concurrentes reconcilian exactamente con el agregado appointments y annual es O(12)', async () => {
        const h = buildHarness();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReportsService,
                { provide: getModelToken(MonthlyStats.name), useValue: h.statsModel },
                { provide: getModelToken(MonthlyStatsPatient.name), useValue: h.spillModel },
                { provide: getConnectionToken(), useValue: h.connection },
            ],
        }).compile();
        const service = module.get<ReportsService>(ReportsService);
        const date = new Date(2025, 5, 15, 10, 0, 0);
        const N = 50;
        const appts: Appt[] = Array.from({ length: N }, (_, i) => ({ docId: 'doc50', userId: `u${i}`, amount: 100 + i, date: date.getTime(), isCompleted: i % 2 === 0, payment: i % 3 === 0, cancelled: false }));
        const booked = await Promise.allSettled(appts.map((a) => service.onAppointmentBooked(a.docId, a.userId, a.amount, new Date(a.date))));
        expect(booked.every((r) => r.status === 'fulfilled')).toBe(true);
        for (const a of appts) {
            if (a.isCompleted) await service.onAppointmentCompleted(a.docId, a.userId, a.amount, new Date(a.date));
            // Nota: el live no acredita payment sin completion (gap §2); el oráculo del backfill sí lo incluye:
        }
        const oracle = appts.reduce((s, a) => ({ total: s.total + 1, completed: s.completed + (a.isCompleted ? 1 : 0), earningsLive: s.earningsLive + (a.isCompleted ? a.amount : 0), earningsBackfill: s.earningsBackfill + (a.isCompleted || a.payment ? a.amount : 0), users: s.users.add(a.userId) }), { total: 0, completed: 0, earningsLive: 0, earningsBackfill: 0, users: new Set<string>() });
        const annual = await service.getAnnualReport('doc50', 2025);
        expect(annual.report.length).toBe(12);
        const june = annual.report[5];
        // Live reconcilia con isCompleted; backfill corrige con (isCompleted||payment):
        expect(june.totalAppointments).toBe(oracle.total);
        expect(june.completedAppointments).toBe(oracle.completed);
        expect(june.earnings).toBe(oracle.earningsLive);
        expect(june.uniquePatients).toBe(oracle.users.size);
        expect(oracle.earningsBackfill).toBeGreaterThanOrEqual(oracle.earningsLive);
        expect(h.statsModel.find).toHaveBeenCalledWith({ docId: 'doc50', year: 2025 });
    });
});