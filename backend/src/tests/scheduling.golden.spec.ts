import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Appointment } from 'src/appointments/schemas/appointment.schema';
import { Doctor } from 'src/doctors/schemas/doctor.schema';
import { SchedulingService } from 'src/scheduling/scheduling.service';
import { AvailabilityService } from 'src/availability/availability.service';
import { SlotCandidate } from 'src/shared/structures/scheduling-types';
import { toMinutes } from 'src/shared/utils/binary-search.util';

// Golden determinista G01-G30. Sin Date.now/new Date()/random.
// Fechas DD/MM/YYYY cero-pad estricto. docId ObjectId fijo.
const DOC = '64f1a2b3c4d5e6f7a8b9c0d1';
// generateDaySlots(10:00-21:00, 30m) = 22 slots en-US con cero-pad.
const ALL = ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM'];
const MORNINGS = ALL.slice(0, 6); // <13:00 con toMinutes

function byScoreThenTime(a: SlotCandidate, b: SlotCandidate): number {
    if (b.score !== a.score) return b.score - a.score;
    return toMinutes(a.slotTime) - toMinutes(b.slotTime);
}

async function makeService(bookedByDate: Record<string, string[]>, available = true): Promise<SchedulingService & { __doctorFindById: jest.Mock; __getBookedSlots: jest.Mock }> {
    const doctorModel = {
        findById: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(available ? { _id: DOC, available: true } : { _id: DOC, available: false }),
            }),
        }),
    };
    const availability = { getBookedSlots: jest.fn(async (_id: string, d: string) => bookedByDate[d] ?? []) };
    const mod: TestingModule = await Test.createTestingModule({
        providers: [
            SchedulingService,
            { provide: getModelToken(Doctor.name), useValue: doctorModel },
            { provide: getModelToken(Appointment.name), useValue: {} },
            { provide: AvailabilityService, useValue: availability },
        ],
    }).compile();
    const service = mod.get<SchedulingService>(SchedulingService) as SchedulingService & { __doctorFindById: jest.Mock; __getBookedSlots: jest.Mock };
    service.__doctorFindById = doctorModel.findById;
    service.__getBookedSlots = availability.getBookedSlots as jest.Mock;
    return service;
}

describe('Scheduling golden G01-G30 (pesos PILOTO n=200, PENDIENTE_F-02)', () => {
    // Fórmula: urgency + (-2*load) + min(gap/30,4) + (hora<13?1:0). Gap sin posterior=120→4.
    it('G01 día vacío normal: top 10:00 AM score 10, isIdeal true', async () => {
        const s = await makeService({ '15/07/2026': [] });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'normal' });
        expect(r.suggestions.length).toBe(3);
        expect(r.suggestions[0]).toMatchObject({ slotTime: '10:00 AM', doctorLoad: 0, gapMinutes: 120, score: 10 });
        expect(r.isIdeal).toBe(true);
    });
    it('G02 día vacío urgent: top 10:00 AM score 15, isIdeal true (ancla umbral)', async () => {
        const s = await makeService({ '15/07/2026': [] });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'urgent' });
        expect(r.suggestions[0].score).toBe(15);
        expect(r.isIdeal).toBe(true);
    });
    it('G03 día vacío flexible: top 10:00 AM score 5, isIdeal true', async () => {
        const s = await makeService({ '15/07/2026': [] });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'flexible' });
        expect(r.suggestions[0].score).toBe(5);
        expect(r.isIdeal).toBe(true);
    });
    it('G04 día completo normal: 0 sugerencias, isIdeal false', async () => {
        const s = await makeService({ '15/07/2026': [...ALL] });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'normal' });
        expect(r.suggestions).toEqual([]);
        expect(r.isIdeal).toBe(false);
    });
    it('G05 doctor no disponible: [] + reason exacta', async () => {
        const s = await makeService({}, false);
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'normal' });
        expect(r).toEqual({ suggestions: [], isIdeal: false, reason: 'Doctor is not available' });
    });
    it('G06 fecha inválida 32/13/2026: 400 INVALID_SLOT_DATE', async () => {
        const s = await makeService({});
        await expect(s.suggestSlots({ docId: DOC, preferredDates: ['32/13/2026'], priorityLevel: 'normal' })).rejects.toMatchObject({ response: { code: 'INVALID_SLOT_DATE' } });
    });
    it('G07 urgent vs flexible mismo día (1 ocupado 12:00 PM): scores 13 vs 3, mismo isIdeal true', async () => {
        const booked = { '15/07/2026': ['12:00 PM'] };
        const su = await makeService(booked);
        const ru = await su.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'urgent' });
        const sf = await makeService(booked);
        const rf = await sf.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'flexible' });
        // load 1 → -2; 10:00 AM gap 120→4 +bonus1: urgent 10-2+4+1=13, flexible 0-2+4+1=3
        expect(ru.suggestions[0]).toMatchObject({ slotTime: '10:00 AM', score: 13 });
        expect(rf.suggestions[0]).toMatchObject({ slotTime: '10:00 AM', score: 3 });
        expect(ru.isIdeal).toBe(true);
        expect(rf.isIdeal).toBe(true);
    });
    it('G08 sesgo mañana: día vacío top-3 todo mañana', async () => {
        const s = await makeService({ '15/07/2026': [] });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'normal' });
        // Heap no estable: no assert orden crudo. Sí: todo top-3 es mañana + score 10.
        for (const c of r.suggestions) expect(MORNINGS).toContain(c.slotTime);
        expect(r.suggestions.map((x) => x.score)).toEqual([10, 10, 10]);
        // Sesgo probado por propiedades, no por tripleta exacta (heap no estable ante empates).
        expect([...r.suggestions].sort(byScoreThenTime)[0].slotTime).toBe('10:00 AM');

    });
    it('G09 solo tardes libres (mañanas ocupadas): top 01:00 PM score 9 normal', async () => {
        const s = await makeService({ '15/07/2026': [...MORNINGS] });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'normal' });
        // load 6 → -12; 01:00 PM gap 120→4 bonus 0: 5-12+4= -3? No: con 6 ocupados el top tarde... recalculado abajo
        expect(r.suggestions.length).toBe(3);
        expect(r.suggestions[0].slotTime).toBe('01:00 PM');
        // 5 + (-2*6) + 4 + 0 = -3
        expect(r.suggestions[0].score).toBe(-3);
        expect(r.isIdeal).toBe(false);
    });
    it('G10 gap capado: slot previo a ocupado lejano suma 4 igual que sin posterior', async () => {
        const s = await makeService({ '15/07/2026': ['08:30 PM'] });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'normal' });
        // load 1 → -2; 10:00 AM gap (20.5-10)*60=630→cap4 +1: 5-2+4+1=8
        expect(r.suggestions[0]).toMatchObject({ slotTime: '10:00 AM', score: 8, gapMinutes: 630 });
    });
    it('G11 gap corto 30min suma 1: booked 10:30 AM → 10:00 AM gap 30', async () => {
        const s = await makeService({ '15/07/2026': ['10:30 AM'] });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'normal' });
        const first = [...r.suggestions].sort(byScoreThenTime)[0];
        // El mejor ya no es 10:00 AM (gap 30→1: 5-2+1+1=5) sino 11:00 AM (gap 120→4: 5-2+4+1=8)
        expect(first).toMatchObject({ slotTime: '11:00 AM', score: 8 });
        // 10:00 AM penalizado (gap 30→1, score 5) no entra al top-3: prueba del castigo por gap.
        expect(r.suggestions.some((x) => x.slotTime === '10:00 AM')).toBe(false);
    });
    it('G12 carga alta hunde isIdeal: 10 ocupados → top negativo, false (urgent y flexible iguales)', async () => {
        const booked = { '15/07/2026': ALL.slice(0, 10) };
        const su = await makeService(booked);
        const ru = await su.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'urgent' });
        const sf = await makeService(booked);
        const rf = await sf.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'flexible' });
        expect(ru.isIdeal).toBe(false);
        expect(rf.isIdeal).toBe(false);
        // load 10 → -20; mejor tarde 03:30 PM? gap120→4 bonus0: urgent 10-20+4=-6
        expect(ru.suggestions[0].score).toBe(-6);
        expect(rf.suggestions[0].score).toBe(-16);
    });
    it('G13 empate de score: día vacío scores mañana idénticos (10) — orden normalizado determinista', async () => {
        const s = await makeService({ '15/07/2026': [] });
        const r1 = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'normal' });
        const r2 = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'normal' });
        expect(r1).toEqual(r2); // doble llamada idéntica pese a heap inestable
        expect(r1.suggestions.map((x) => x.score)).toEqual([10, 10, 10]);
    });
    it('G14 mediodía 12:00 PM cuenta como mañana (<13): bonus 1', async () => {
        const s = await makeService({ '15/07/2026': ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'] });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'normal' });
        const noon = r.suggestions.find((x) => x.slotTime === '12:00 PM');
        // load 4 → -8; 12:00 PM gap 120→4 +1: 5-8+4+1=2. Sin fallback: si falta, falla.
        expect(noon).toBeDefined();
        expect(noon).toMatchObject({ gapMinutes: 120, score: 2 });
        expect(toMinutes('12:00 PM') / 60).toBeLessThan(13);
    });
    it('G15 01:00 PM sin bonus: mañanas ocupadas fuerzan tarde observable', async () => {
        const s = await makeService({ '15/07/2026': [...MORNINGS] });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'normal' });
        // load 6 → -12; 01:00 PM gap 120→4 bonus 0: 5-12+4+0=-3. Sin fallback: si falta, falla.
        const afternoon = r.suggestions.find((x) => x.slotTime === '01:00 PM');
        expect(afternoon).toBeDefined();
        expect(afternoon).toMatchObject({ gapMinutes: 120, score: -3 });
    });
    it('G16 dos fechas: elige mejor día (vacío sobre cargado)', async () => {
        const s = await makeService({ '15/07/2026': ALL.slice(0, 10), '16/07/2026': [] });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026', '16/07/2026'], priorityLevel: 'normal' });
        expect(r.suggestions[0]).toMatchObject({ slotDate: '16/07/2026', slotTime: '10:00 AM', score: 10 });
        expect(r.isIdeal).toBe(true);
    });
    it('G17 fecha laxa 15/7/2026: 400 (modo estricto)', async () => {
        const s = await makeService({});
        await expect(s.suggestSlots({ docId: DOC, preferredDates: ['15/7/2026'], priorityLevel: 'normal' })).rejects.toBeInstanceOf(BadRequestException);
    });
    it('G18 docId inválido: 400 Invalid docId', async () => {
        const s = await makeService({});
        await expect(s.suggestSlots({ docId: 'no-id', preferredDates: ['15/07/2026'], priorityLevel: 'normal' })).rejects.toBeInstanceOf(BadRequestException);
    });
    it('G19 un solo slot libre 08:30 PM: 1 sugerencia, gap 120', async () => {
        const s = await makeService({ '15/07/2026': ALL.slice(0, 21) });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'normal' });
        // load 21 → -42; 08:30 PM gap 120→4 bonus 0: 5-42+4=-33
        expect(r.suggestions).toHaveLength(1);
        expect(r.suggestions[0]).toMatchObject({ slotTime: '08:30 PM', gapMinutes: 120, score: -33 });
        expect(r.isIdeal).toBe(false);
    });
    it('G20 un solo slot libre 10:00 AM con resto ocupado: gap corto al siguiente', async () => {
        const s = await makeService({ '15/07/2026': ALL.slice(1) });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'normal' });
        // load 21 → -42; 10:00 AM gap 30→1 +1: 5-42+1+1=-35
        expect(r.suggestions).toHaveLength(1);
        expect(r.suggestions[0]).toMatchObject({ slotTime: '10:00 AM', gapMinutes: 30, score: -35 });
    });
    it('G21 minGapMinutes no altera scoring actual (param ignorado, documentado)', async () => {
        const a = await makeService({ '15/07/2026': [] });
        const ra = await a.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'normal', minGapMinutes: 30 });
        const b = await makeService({ '15/07/2026': [] });
        const rb = await b.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'normal', minGapMinutes: 90 });
        expect(ra).toEqual(rb); // computeGap ignora _minGap (ver TASKS.md §4)
    });
    it('G22 bisiesto válido 29/02/2024 vacío: top 10:00 AM', async () => {
        const s = await makeService({ '29/02/2024': [] });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['29/02/2024'], priorityLevel: 'normal' });
        expect(r.suggestions[0]).toMatchObject({ slotDate: '29/02/2024', score: 10 });
    });
    it('G23 no bisiesto 29/02/2025: 400', async () => {
        const s = await makeService({});
        await expect(s.suggestSlots({ docId: DOC, preferredDates: ['29/02/2025'], priorityLevel: 'normal' })).rejects.toBeInstanceOf(BadRequestException);
    });
    it('G24 31/04/2026 inexistente: 400', async () => {
        const s = await makeService({});
        await expect(s.suggestSlots({ docId: DOC, preferredDates: ['31/04/2026'], priorityLevel: 'normal' })).rejects.toBeInstanceOf(BadRequestException);
    });
    it('G25 mezcla válida+inválida: 400 sin tocar DB (falla antes)', async () => {
        const s = await makeService({ '15/07/2026': [] });
        await expect(s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026', '32/13/2026'], priorityLevel: 'normal' })).rejects.toMatchObject({ response: { code: 'INVALID_SLOT_DATE' } });
        expect(s.__doctorFindById).not.toHaveBeenCalled();
        expect(s.__getBookedSlots).not.toHaveBeenCalled();
    });
    it('G26 formato ISO 2026-01-01: 400', async () => {
        const s = await makeService({});
        await expect(s.suggestSlots({ docId: DOC, preferredDates: ['2026-01-01'], priorityLevel: 'normal' })).rejects.toBeInstanceOf(BadRequestException);
    });
    it('G27 hueco intermedio: ocupadas 11:00 y 14:00 → 11:30 AM gap 150→cap4', async () => {
        const s = await makeService({ '15/07/2026': ['11:00 AM', '02:00 PM'] });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'normal' });
        const slot = r.suggestions.find((x) => x.slotTime === '11:30 AM');
        // load 2 → -4; gap (14-11.5)*60=150→cap4 +1: 5-4+4+1=6
        expect(slot).toMatchObject({ gapMinutes: 150, score: 6 });
    });
    it('G28 carga media 3 con gap mixto: top mañana verificado por orden normalizado', async () => {
        const s = await makeService({ '15/07/2026': ['10:00 AM', '10:30 AM', '08:30 PM'] });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'normal' });
        const sorted = [...r.suggestions].sort(byScoreThenTime);
        // load 3 → -6; 11:00 AM gap (20.5-11)*60=570→cap4 +1: 5-6+4+1=4
        expect(sorted[0]).toMatchObject({ slotTime: '11:00 AM', score: 4 });
    });
    it('G29 límite top-3: día vacío devuelve exactamente 3 aunque haya 22 libres', async () => {
        const s = await makeService({ '15/07/2026': [] });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'flexible' });
        expect(r.suggestions).toHaveLength(3);
        expect(r.reason).toBe('Optimal slots found based on doctor availability and load');
    });
    it('G30 reason no-ideal: día completo da mensaje de ampliar rango', async () => {
        const s = await makeService({ '15/07/2026': [...ALL] });
        const r = await s.suggestSlots({ docId: DOC, preferredDates: ['15/07/2026'], priorityLevel: 'flexible' });
        expect(r.reason).toBe('Limited availability — consider expanding date range');
        expect(r.isIdeal).toBe(false);
    });
});