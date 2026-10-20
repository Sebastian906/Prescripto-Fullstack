import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from 'src/audit/audit.service';
import {
  Appointment,
  AppointmentDocument,
  CLINICAL_APPOINTMENT_FILTERS,
} from 'src/appointments/schemas/appointment.schema';
import { ConsentService } from 'src/consent/consent.service';
import {
  ENCRYPTED_FIELD_PATTERN,
  decryptField,
  encryptField,
} from 'src/shared/utils/encryption.util';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { QueryMedicalRecordsDto } from './dto/query-medical-records.dto';
import {
  MedicalRecord,
  MedicalRecordDocument,
} from './schemas/medical-record.schema';

export const TREATMENT_CONSENT_SCOPE = 'treatment';
const DEFAULT_LIMIT = 50;

type LeanMedicalRecord = MedicalRecord & { _id: unknown };

function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 11000
  );
}

@Injectable()
export class MedicalRecordsService {
  private readonly logger = new Logger(MedicalRecordsService.name);

  constructor(
    @InjectModel(MedicalRecord.name)
    private readonly model: Model<MedicalRecordDocument>,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    private readonly consents: ConsentService,
    private readonly audit: AuditService,
  ) {}

  async create(docId: string, dto: CreateMedicalRecordDto) {
    const appointment = await this.appointmentModel
      .findById(dto.appointmentId)
      .lean()
      .exec();

    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.docId !== docId) {
      throw new ForbiddenException('Not your appointment');
    }
    if (!appointment.isCompleted) {
      throw new BadRequestException('Appointment is not completed');
    }

    const consented = await this.consents.hasGrantedScope(
      appointment.userId,
      TREATMENT_CONSENT_SCOPE,
    );
    if (!consented) {
      throw new ForbiddenException('Active treatment consent required');
    }

    let record: MedicalRecordDocument;
    try {
      record = await this.model.create({
        userId: appointment.userId,
        doctorId: docId,
        appointmentId: String(appointment._id),
        diagnosis: dto.diagnosis,
        notes: encryptField(dto.notes),
        attachments: dto.attachments ?? [],
      });
    } catch (err) {
      if (isDuplicateKey(err)) {
        throw new ConflictException(
          'A record already exists for this appointment',
        );
      }
      throw err;
    }

    await this.auditSafe({
      actorId: docId,
      role: 'doctor',
      action: 'medical_record.created',
      entityId: String(record._id),
      meta: { appointmentId: String(appointment._id) },
    });

    return { success: true, id: String(record._id) };
  }

  async listMine(userId: string, query: QueryMedicalRecordsDto) {
    const records = await this.listByFilter({ userId }, query);
    return { success: true, count: records.length, records };
  }

  async listForDoctor(docId: string, query: QueryMedicalRecordsDto) {
    const records = await this.listByFilter({ doctorId: docId }, query);
    return { success: true, count: records.length, records };
  }

  async getForPatient(userId: string, id: string) {
    const record = await this.findOrFail(id);
    if (record.userId !== userId) {
      throw new ForbiddenException('Not your medical record');
    }
    await this.auditSafe({
      actorId: userId,
      role: 'patient',
      action: 'medical_record.read',
      entityId: String(record._id),
      meta: { appointmentId: record.appointmentId },
    });
    return this.toPublic(record);
  }

  async getForDoctor(docId: string, id: string) {
    const record = await this.findOrFail(id);
    if (record.doctorId !== docId) {
      throw new ForbiddenException('Not your patient');
    }
    await this.auditSafe({
      actorId: docId,
      role: 'doctor',
      action: 'medical_record.read',
      entityId: String(record._id),
      meta: { appointmentId: record.appointmentId },
    });
    return this.toPublic(record);
  }

  async getStatus() {
    const clinicalFilter = {
      isCompleted: true,
      $or: CLINICAL_APPOINTMENT_FILTERS,
    };
    const [total, encrypted, latest, clinical] = await Promise.all([
      this.model.countDocuments().exec(),
      this.model.countDocuments({ notes: ENCRYPTED_FIELD_PATTERN }).exec(),
      this.model
        .findOne()
        .sort({ createdAt: -1 })
        .select('createdAt')
        .lean()
        .exec() as Promise<{ createdAt?: Date } | null>,
      this.appointmentModel.countDocuments(clinicalFilter).exec(),
    ]);

    return {
      total,
      encrypted,
      migratedAt:
        latest && latest.createdAt
          ? new Date(latest.createdAt).toISOString()
          : null,
      // ponytail: approximation (appointments still holding clinical keys).
      // Exact $lookup by appointmentId if this number becomes actionable.
      pending: Math.max(clinical - total, 0),
    };
  }

  private async listByFilter(
    filter: Record<string, string>,
    query: QueryMedicalRecordsDto,
  ) {
    const docs = (await this.model
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(query.offset ?? 0)
      .limit(query.limit ?? DEFAULT_LIMIT)
      .lean()
      .exec()) as unknown as LeanMedicalRecord[];
    return docs.map((doc) => this.toPublic(doc));
  }

  private async findOrFail(id: string): Promise<LeanMedicalRecord> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid medical record id');
    }
    const record = (await this.model
      .findById(id)
      .lean()
      .exec()) as unknown as LeanMedicalRecord | null;
    if (!record) throw new NotFoundException('Medical record not found');
    return record;
  }

  private toPublic(record: LeanMedicalRecord) {
    return { ...record, notes: decryptField(record.notes) };
  }

  private async auditSafe(entry: {
    actorId: string;
    role: string;
    action: string;
    entityId: string;
    meta: Record<string, string>;
  }): Promise<void> {
    try {
      await this.audit.record(entry);
    } catch {
      // Ids only: never log clinical payload.
      this.logger.warn(
        `audit failed action=${entry.action} entity=${entry.entityId}`,
      );
    }
  }
}
