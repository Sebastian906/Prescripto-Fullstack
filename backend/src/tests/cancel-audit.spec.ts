import { AppointmentsService } from '../appointments/appointments.service';
import { DoctorsService } from '../doctors/doctors.service';
import { AdminService } from '../admin/admin.service';

const session = { withTransaction: (fn: () => Promise<void>) => fn(), endSession: jest.fn() };
const connection = { startSession: jest.fn().mockResolvedValue(session) } as any;
const auditService = { record: jest.fn().mockResolvedValue({}) } as any;
const reportsService = { onAppointmentCancelled: jest.fn().mockResolvedValue(undefined), onAppointmentCompleted: jest.fn().mockResolvedValue(undefined) } as any;

describe('cancel writes exactly one AuditLog entry per role', () => {
    beforeEach(() => jest.clearAllMocks());

    it('user cancel → 1 record', async () => {
        const appt = { _id: 'a1', userId: 'u1', docId: 'd1', slotDate: '01/01/2026', slotTime: '10:00', date: Date.now(), cancelled: false };
        const appointmentModel = { findById: jest.fn().mockReturnValue({ session: () => Promise.resolve(appt) }), findByIdAndUpdate: jest.fn().mockResolvedValue({}) } as any;
        const doctorModel = { findByIdAndUpdate: jest.fn().mockResolvedValue({}) } as any;
        const svc = new AppointmentsService(appointmentModel, doctorModel, {} as any, connection, {} as any, reportsService, auditService);
        await svc.cancelAppointment('u1', { appointmentId: 'a1' } as any);
        expect(auditService.record).toHaveBeenCalledTimes(1);
        expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'u1', role: 'user', action: 'appointment.cancel', entityId: 'a1' }));
    });

    it('doctor cancel → 1 record', async () => {
        const appt = { _id: 'a2', docId: 'd1', slotDate: '01/01/2026', slotTime: '10:00', date: Date.now(), cancelled: false };
        const appointmentModel = { findById: jest.fn().mockResolvedValue(appt), findByIdAndUpdate: jest.fn().mockResolvedValue({}) } as any;
        const doctorModel = { findById: jest.fn().mockResolvedValue({ slots_booked: {} }), findByIdAndUpdate: jest.fn().mockResolvedValue({}) } as any;
        const svc = new DoctorsService(doctorModel, appointmentModel, {} as any, {} as any, reportsService, auditService);
        await svc.cancelAppointmentDoctor('d1', 'a2');
        expect(auditService.record).toHaveBeenCalledTimes(1);
        expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'd1', role: 'doctor', action: 'appointment.cancel', entityId: 'a2' }));
    });

    it('admin cancel → 1 record', async () => {
        const appt = { _id: 'a3', docId: 'd1', slotDate: '01/01/2026', slotTime: '10:00', cancelled: false };
        const appointmentModel = { findById: jest.fn().mockResolvedValue(appt), findByIdAndUpdate: jest.fn().mockResolvedValue({}) } as any;
        const doctorModel = { findById: jest.fn().mockResolvedValue(null) } as any;
        const svc = new AdminService(doctorModel, appointmentModel, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, auditService);
        await svc.cancelAppointment('a3');
        expect(auditService.record).toHaveBeenCalledTimes(1);
        expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ role: 'admin', action: 'appointment.cancel', entityId: 'a3' }));
    });
});