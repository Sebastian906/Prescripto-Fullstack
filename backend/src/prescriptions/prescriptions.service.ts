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
import { ConsentService } from 'src/consent/consent.service';
import { TREATMENT_CONSENT_SCOPE } from 'src/medical-records/medical-records.service';
import {
  MedicalRecord,
  MedicalRecordDocument,
} from 'src/medical-records/schemas/medical-record.schema';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { QueryPrescriptionsDto } from './dto/query-prescriptions.dto';
import {
  Prescription,
  PrescriptionDocument,
} from './schemas/prescription.schema';

const DEFAULT_LIMIT = 50;

type LeanPrescription = Prescription & { _id: unknown };
type LeanRecord = MedicalRecord & { _id: unknown };

function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 11000
  );
}

@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);

  constructor(
    @InjectModel(Prescription.name)
    private readonly model: Model<PrescriptionDocument>,
    @InjectModel(MedicalRecord.name)
    private readonly recordModel: Model<MedicalRecordDocument>,
    private readonly consents: ConsentService,
    private readonly audit: AuditService,
  ) {}

  async create(docId: string, dto: CreatePrescriptionDto) {
    if (!Types.ObjectId.isValid(dto.recordId)) {
      throw new BadRequestException('Invalid medical record id');
    }

    const record = (await this.recordModel
      .findById(dto.recordId)
      .lean()
      .exec()) as unknown as LeanRecord | null;

    if (!record) throw new NotFoundException('Medical record not found');
    if (record.doctorId !== docId) {
      throw new ForbiddenException('Not your medical record');
    }

    const consented = await this.consents.hasGrantedScope(
      record.userId,
      TREATMENT_CONSENT_SCOPE,
    );
    if (!consented) {
      throw new ForbiddenException('Active treatment consent required');
    }

    let prescription: PrescriptionDocument;
    try {
      prescription = await this.model.create({
        recordId: dto.recordId,
        userId: record.userId,
        doctorId: docId,
        items: dto.items,
        issuedAt: new Date(),
        revokedAt: null,
      });
    } catch (err) {
      if (isDuplicateKey(err)) {
        throw new ConflictException(
          'A prescription already exists for this record version',
        );
      }
      throw err;
    }

    await this.auditSafe({
      actorId: docId,
      role: 'doctor',
      action: 'prescription.issued',
      entityId: String(prescription._id),
      meta: { recordId: dto.recordId },
    });

    return { success: true, id: String(prescription._id) };
  }

  async listMine(userId: string, query: QueryPrescriptionsDto) {
    const prescriptions = await this.listByFilter({ userId }, query);
    return { success: true, count: prescriptions.length, prescriptions };
  }

  async listForDoctor(docId: string, query: QueryPrescriptionsDto) {
    const prescriptions = await this.listByFilter({ doctorId: docId }, query);
    return { success: true, count: prescriptions.length, prescriptions };
  }

  async getForPatient(userId: string, id: string) {
    const prescription = await this.findOrFail(id);
    if (prescription.userId !== userId) {
      throw new ForbiddenException('Not your prescription');
    }
    await this.auditSafe({
      actorId: userId,
      role: 'patient',
      action: 'prescription.read',
      entityId: String(prescription._id),
      meta: { recordId: prescription.recordId },
    });
    return this.toPublic(prescription);
  }

  async getForDoctor(docId: string, id: string) {
    const prescription = await this.findOrFail(id);
    if (prescription.doctorId !== docId) {
      throw new ForbiddenException('Not your patient prescription');
    }
    await this.auditSafe({
      actorId: docId,
      role: 'doctor',
      action: 'prescription.read',
      entityId: String(prescription._id),
      meta: { recordId: prescription.recordId },
    });
    return this.toPublic(prescription);
  }

  async revoke(docId: string, id: string) {
    const prescription = await this.findOrFail(id);
    if (prescription.doctorId !== docId) {
      throw new ForbiddenException('Not your prescription');
    }

    if (prescription.revokedAt) {
      return {
        success: true,
        id: String(prescription._id),
        revokedAt: prescription.revokedAt,
        alreadyRevoked: true,
      };
    }

    const revokedAt = new Date();
    await this.model
      .updateOne({ _id: String(prescription._id) }, { $set: { revokedAt } })
      .exec();

    await this.auditSafe({
      actorId: docId,
      role: 'doctor',
      action: 'prescription.revoked',
      entityId: String(prescription._id),
      meta: { recordId: prescription.recordId },
    });

    return {
      success: true,
      id: String(prescription._id),
      revokedAt,
      alreadyRevoked: false,
    };
  }

  async getStatus() {
    const [total, revoked, latest, records] = await Promise.all([
      this.model.countDocuments().exec(),
      this.model.countDocuments({ revokedAt: { $ne: null } }).exec(),
      this.model
        .findOne()
        .sort({ issuedAt: -1 })
        .select('issuedAt')
        .lean()
        .exec() as Promise<{ issuedAt?: Date } | null>,
      this.recordModel.countDocuments().exec(),
    ]);

    return {
      total,
      active: total - revoked,
      revoked,
      latestIssuedAt:
        latest && latest.issuedAt
          ? new Date(latest.issuedAt).toISOString()
          : null,
      // Exact per-record count via $lookup if this number becomes actionable.
      pending: Math.max(records - total, 0),
    };
  }

  private async listByFilter(
    filter: Record<string, string>,
    query: QueryPrescriptionsDto,
  ) {
    const docs = (await this.model
      .find(filter)
      .sort({ issuedAt: -1 })
      .skip(query.offset ?? 0)
      .limit(query.limit ?? DEFAULT_LIMIT)
      .lean()
      .exec()) as unknown as LeanPrescription[];

    return docs.map((doc) => this.toPublic(doc));
  }

  private async findOrFail(id: string): Promise<LeanPrescription> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid prescription id');
    }
    const prescription = (await this.model
      .findById(id)
      .lean()
      .exec()) as unknown as LeanPrescription | null;
    if (!prescription) throw new NotFoundException('Prescription not found');
    return prescription;
  }

  private toPublic(prescription: LeanPrescription) {
    return {
      _id: String(prescription._id),
      recordId: prescription.recordId,
      userId: prescription.userId,
      doctorId: prescription.doctorId,
      items: prescription.items,
      issuedAt: prescription.issuedAt,
      revokedAt: prescription.revokedAt ?? null,
      status: prescription.revokedAt ? 'revoked' : 'active',
    };
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
      // Ids only: never log the drug payload.
      this.logger.warn(
        `audit failed action=${entry.action} entity=${entry.entityId}`,
      );
    }
  }
}
