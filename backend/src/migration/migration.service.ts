import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { AnyBulkWriteOperation, Connection, Model, Types } from 'mongoose';
import {
  Appointment,
  AppointmentDocument,
  CLINICAL_APPOINTMENT_FILTERS,
  CLINICAL_UNSET_PATHS,
} from 'src/appointments/schemas/appointment.schema';
import {
  PasswordResetToken,
  PasswordResetTokenDocument,
} from 'src/auth/password-reset-token.schema';
import { Doctor, DoctorDocument } from 'src/doctors/schemas/doctor.schema';
import {
  Referral,
  ReferralDocument,
} from 'src/referrals/schemas/referral.schema';
import {
  MonthlyStats,
  MonthlyStatsDocument,
} from 'src/reports/schemas/monthly-stats.schema';
import {
  Speciality,
  SpecialityDocument,
} from 'src/specialities/schemas/speciality.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { PostgresService } from './postgres.service';
import { PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import {
  Availability,
  AvailabilityDocument,
} from 'src/availability/schemas/availability.schema';
import { normalizeSlotDate } from 'src/availability/availability.service';
import {
  DiagnosisCode,
  isWritableDiagnosisCode,
} from 'src/medical-records/catalog/diagnosis.catalog';
import {
  LEGACY_BACKFILL_SOURCE,
  MedicalRecord,
  MedicalRecordDocument,
} from 'src/medical-records/schemas/medical-record.schema';
import { encryptField } from 'src/shared/utils/encryption.util';
import {
  Prescription,
  PrescriptionDocument,
} from 'src/prescriptions/schemas/prescription.schema';

export interface MigrationResult {
  collection: string;
  migrated: number;
  skipped: number;
  errors: number;
  durationMs: number;
  errorDetails?: string[];
}

export interface MigrationReport {
  startedAt: string;
  finishedAt: string;
  totalDurationMs: number;
  results: MigrationResult[];
  schemaCreated: boolean;
}

interface WaitlistRawDoc {
  _id: unknown;
  doctorId?: unknown;
  userId?: unknown;
  slotDateKey?: unknown;
  slotTime?: unknown;
  status?: unknown;
}

function toWaitlistStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

interface ClinicalAppointmentRaw {
  _id: unknown;
  userId?: unknown;
  docId?: unknown;
  userData?: unknown;
  docData?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asClinicalText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value == null) return '';
  const serialized = JSON.stringify(value);
  if (serialized === undefined) return '';
  return serialized === '{}' || serialized === '[]' ? '' : serialized;
}

function firstNonEmpty(...values: string[]): string {
  return values.find((value) => value.length > 0) ?? '';
}

export async function backfillMedicalRecords(
  appointmentModel: Model<AppointmentDocument>,
  medicalRecordModel: Model<MedicalRecordDocument>,
): Promise<MigrationResult> {
  const start = Date.now();
  const result: MigrationResult = {
    collection: 'medical_records',
    migrated: 0,
    skipped: 0,
    errors: 0,
    durationMs: 0,
  };

  const cursor = appointmentModel
    .find({ isCompleted: true, $or: CLINICAL_APPOINTMENT_FILTERS })
    .lean()
    .cursor();

  for await (const raw of cursor as unknown as AsyncIterable<ClinicalAppointmentRaw>) {
    const appointmentId = String(raw._id);
    try {
      const userData = asRecord(raw.userData);
      const docData = asRecord(raw.docData);
      const rawDiagnosis = firstNonEmpty(
        asClinicalText(userData.diagnosis),
        asClinicalText(docData.diagnosis),
      );

      const noteParts = [
        asClinicalText(userData.notes),
        asClinicalText(userData.clinicalNotes),
        asClinicalText(docData.notes),
        asClinicalText(docData.clinicalNotes),
      ].filter((v) => v.length > 0);

      const structured = (
        [
          [
            'prescription',
            firstNonEmpty(
              asClinicalText(userData.prescription),
              asClinicalText(docData.prescription),
            ),
          ],
          [
            'treatment',
            firstNonEmpty(
              asClinicalText(userData.treatment),
              asClinicalText(docData.treatment),
            ),
          ],
          [
            'symptoms',
            firstNonEmpty(
              asClinicalText(userData.symptoms),
              asClinicalText(docData.symptoms),
            ),
          ],
        ] as const
      )
        .filter(([, v]) => v.length > 0)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');

      const sourceNotes = [noteParts.join('\n\n'), structured]
        .filter(Boolean)
        .join('\n\n');

      if (!sourceNotes && !rawDiagnosis) {
        result.skipped++;
        continue;
      }

      const diagnosis = isWritableDiagnosisCode(rawDiagnosis)
        ? rawDiagnosis
        : DiagnosisCode.UnclassifiedLegacy;

      const res = await medicalRecordModel
        .updateOne(
          { appointmentId },
          {
            $setOnInsert: {
              userId: asString(raw.userId),
              doctorId: asString(raw.docId),
              appointmentId,
              diagnosis,
              notes: sourceNotes ? encryptField(sourceNotes) : '',
              attachments: [],
              source: LEGACY_BACKFILL_SOURCE,
            },
          },
          { upsert: true },
        )
        .exec();

      if ((res.upsertedCount ?? 0) > 0) {
        result.migrated++;
      } else {
        const existing = await medicalRecordModel
          .findOne({ appointmentId })
          .select('source')
          .lean()
          .exec();
        if (existing?.source !== LEGACY_BACKFILL_SOURCE) {
          const source = existing?.source ?? 'unknown';
          result.errors++;
          (result.errorDetails ??= []).push(
            `medical_record ${appointmentId}: existing record source "${source}" is not "${LEGACY_BACKFILL_SOURCE}"; legacy clinical fields preserved`,
          );
          continue;
        }
        result.skipped++;
      }

      await appointmentModel
        .updateOne(
          { _id: new Types.ObjectId(String(raw._id)) },
          { $unset: CLINICAL_UNSET_PATHS },
        )
        .exec();
    } catch (err) {
      result.errors++;
      const message = err instanceof Error ? err.message : String(err);
      (result.errorDetails ??= []).push(
        `medical_record ${appointmentId}: ${message}`,
      );
    }
  }

  result.durationMs = Date.now() - start;
  return result;
}

export async function backfillPrescriptions(
  prescriptionModel: Model<PrescriptionDocument>,
): Promise<MigrationResult> {
  const start = Date.now();
  const result: MigrationResult = {
    collection: 'prescriptions',
    migrated: 0,
    skipped: 0,
    errors: 0,
    durationMs: 0,
  };

  try {
    await prescriptionModel.createIndexes();
  } catch (err) {
    result.errors++;
    (result.errorDetails ??= []).push(
      err instanceof Error ? err.message : String(err),
    );
  }

  result.durationMs = Date.now() - start;
  return result;
}

const SCHEMA_FILES = [
  '001_create_schema.sql',
  '002_advanced_objects.sql',
  '003_monthly_stats_spill.sql',
];

const SPILL_BATCH = 1000;

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    @InjectModel(Doctor.name)
    private readonly doctorModel: Model<DoctorDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Speciality.name)
    private readonly specialityModel: Model<SpecialityDocument>,
    @InjectModel(MonthlyStats.name)
    private readonly statsModel: Model<MonthlyStatsDocument>,
    @InjectModel(PasswordResetToken.name)
    private readonly tokenModel: Model<PasswordResetTokenDocument>,
    @InjectModel(Referral.name)
    private readonly referralModel: Model<ReferralDocument>,
    @InjectModel(Availability.name)
    private readonly availabilityModel: Model<AvailabilityDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly pg: PostgresService,
    @InjectModel(MedicalRecord.name)
    private readonly medicalRecordModel: Model<MedicalRecordDocument>,
    @InjectModel(Prescription.name)
    private readonly prescriptionModel: Model<PrescriptionDocument>,
  ) {}

  async runFullMigration(
    options: {
      dropAndRecreate?: boolean;
      collections?: string[];
    } = {},
  ): Promise<MigrationReport> {
    const startedAt = new Date();
    this.logger.log('Starting full migration MongoDB → PostgreSQL');

    const schemaCreated = await this.ensureSchema(
      options.dropAndRecreate ?? false,
    );

    const collections = options.collections ?? [
      'users',
      'specialities',
      'doctors',
      'slots',
      'appointments',
      'waitlist',
      'monthly_stats',
      'password_reset_tokens',
      'conversations',
      'referrals',
    ];

    const results: MigrationResult[] = [];

    for (const col of collections) {
      this.logger.log(`Migrating: ${col}`);
      const result = await this.migrateCollection(col);
      results.push(result);
      this.logger.log(
        `  ✓ ${result.migrated} migrated, ${result.skipped} skipped, ${result.errors} errors (${result.durationMs}ms)`,
      );
    }

    const finishedAt = new Date();
    return {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      totalDurationMs: finishedAt.getTime() - startedAt.getTime(),
      results,
      schemaCreated,
    };
  }

  async ensureSchema(dropAndRecreate = false): Promise<boolean> {
    try {
      if (dropAndRecreate) {
        await this.dropAllTables();
      }

      for (const file of SCHEMA_FILES) {
        const sql = this.readSqlFile(file);
        if (!sql) {
          this.logger.warn(`Schema file not found: ${file}`);
          continue;
        }
        try {
          await this.pg.query(sql); // archivo completo, una sola llamada
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          // tolerar solo el SELECT demo con typo al final de 002
          if (/vista_citas_completa/.test(msg) && /does not exist/i.test(msg))
            continue;
          throw err;
        }
      }

      this.logger.log('Schema created/verified successfully');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Schema creation failed', message);
      throw err;
    }
  }

  private readSqlFile(file: string): string | null {
    const candidates = [
      path.join(process.cwd(), 'dist', 'migration', 'sql', file),
      path.join(process.cwd(), 'src', 'migration', 'sql', file),
    ];
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
      } catch {
        continue;
      }
    }
    return null;
  }

  private async dropAllTables(): Promise<void> {
    const tables = [
      'referrals',
      'conversation_messages',
      'conversations',
      'waitlist',
      'monthly_stats_patients',
      'monthly_stats',
      'password_reset_tokens',
      'doctor_slots_booked',
      'appointments',
      'doctors',
      'specialities',
      'users',
    ];
    for (const t of tables) {
      await this.pg.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
    }
    this.logger.warn('All tables dropped');
  }

  async migrateCollection(name: string): Promise<MigrationResult> {
    const start = Date.now();
    const result: MigrationResult = {
      collection: name,
      migrated: 0,
      skipped: 0,
      errors: 0,
      durationMs: 0,
    };
    try {
      switch (name) {
        case 'users':
          await this.migrateUsers(result);
          break;
        case 'specialities':
          await this.migrateSpecialities(result);
          break;
        case 'doctors':
          await this.migrateDoctors(result);
          break;
        case 'slots':
          await this.migrateDoctorSlots(result);
          break;
        case 'appointments':
          await this.migrateAppointments(result);
          break;
        case 'waitlist':
          await this.migrateWaitlist(result);
          break;
        case 'monthly_stats':
          await this.migrateMonthlyStats(result);
          break;
        case 'password_reset_tokens':
          await this.migratePasswordResetTokens(result);
          break;
        case 'conversations':
          await this.migrateConversations(result);
          break;
        case 'referrals':
          await this.migrateReferrals(result);
          break;
        case 'availability':
          await this.migrateAvailabilityMongo(result);
          break;
        default:
          this.logger.warn(`Unknown collection: ${name}`);
      }
    } catch (err) {
      result.errors++;
      const errorMessage = err instanceof Error ? err.message : String(err);
      result.errorDetails = [errorMessage];
      this.logger.error(`Collection ${name} failed: ${errorMessage}`);
    }
    result.durationMs = Date.now() - start;
    return result;
  }

  private async migrateUsers(result: MigrationResult): Promise<void> {
    const docs = await this.userModel.find({}).lean();

    await this.pg.withTransaction(async (client) => {
      for (const doc of docs) {
        try {
          await client.query(
            `INSERT INTO users
                            (mongo_id, name, email, password, image,
                             address_line1, address_line2, gender, dob, phone)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                         ON CONFLICT (mongo_id) DO UPDATE SET
                            name=EXCLUDED.name, email=EXCLUDED.email,
                            password=EXCLUDED.password, image=EXCLUDED.image,
                            address_line1=EXCLUDED.address_line1,
                            address_line2=EXCLUDED.address_line2,
                            gender=EXCLUDED.gender, dob=EXCLUDED.dob, phone=EXCLUDED.phone`,
            [
              String(doc._id),
              doc.name ?? '',
              doc.email ?? '',
              doc.password ?? '',
              doc.image ?? '',
              doc.address?.line1 ?? '',
              doc.address?.line2 ?? '',
              doc.gender ?? 'Not Selected',
              doc.dob ?? 'Not Selected',
              doc.phone ?? '0000000000',
            ],
          );
          result.migrated++;
        } catch (err) {
          result.errors++;
          const errorMessage = err instanceof Error ? err.message : String(err);
          (result.errorDetails ??= []).push(`user ${doc._id}: ${errorMessage}`);
        }
      }
    });
  }

  private async migrateSpecialities(result: MigrationResult): Promise<void> {
    const docs = await this.specialityModel.find({}).lean();

    await this.pg.withTransaction(async (client) => {
      for (const doc of docs) {
        try {
          await client.query(
            `INSERT INTO specialities
                            (mongo_id, name, slug, parent_mongo_id, description, icon_url, active)
                         VALUES ($1,$2,$3,$4,$5,$6,$7)
                         ON CONFLICT (mongo_id) DO UPDATE SET
                            name=EXCLUDED.name, slug=EXCLUDED.slug,
                            parent_mongo_id=EXCLUDED.parent_mongo_id,
                            description=EXCLUDED.description,
                            icon_url=EXCLUDED.icon_url, active=EXCLUDED.active`,
            [
              String(doc._id),
              doc.name,
              doc.slug,
              doc.parentId ?? null,
              doc.description ?? '',
              doc.iconUrl ?? '',
              doc.active ?? true,
            ],
          );
          result.migrated++;
        } catch (err) {
          result.errors++;
          const errorMessage = err instanceof Error ? err.message : String(err);
          (result.errorDetails ??= []).push(
            `speciality ${doc._id}: ${errorMessage}`,
          );
        }
      }
    });

    await this.pg.query(`
            UPDATE specialities s
            SET parent_id = p.id
            FROM specialities p
            WHERE s.parent_mongo_id IS NOT NULL
              AND s.parent_mongo_id = p.mongo_id
              AND s.parent_id IS NULL
        `);
  }

  private async migrateDoctors(result: MigrationResult): Promise<void> {
    const docs = await this.doctorModel.find({}).lean();

    await this.pg.withTransaction(async (client) => {
      for (const doc of docs) {
        try {
          const specRow = await this.pg.queryOne<{ id: string }>(
            `SELECT id FROM specialities WHERE name = $1 LIMIT 1`,
            [doc.speciality],
          );

          await client.query(
            `INSERT INTO doctors
                            (mongo_id, name, email, password, image,
                             speciality_name, speciality_id,
                             degree, experience, about, available,
                             fees, address_line1, address_line2, date)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
                         ON CONFLICT (mongo_id) DO UPDATE SET
                            name=EXCLUDED.name, email=EXCLUDED.email,
                            image=EXCLUDED.image, speciality_name=EXCLUDED.speciality_name,
                            speciality_id=EXCLUDED.speciality_id,
                            degree=EXCLUDED.degree, experience=EXCLUDED.experience,
                            about=EXCLUDED.about, available=EXCLUDED.available,
                            fees=EXCLUDED.fees, address_line1=EXCLUDED.address_line1,
                            address_line2=EXCLUDED.address_line2`,
            [
              String(doc._id),
              doc.name,
              doc.email,
              doc.password,
              doc.image ?? '',
              doc.speciality ?? '',
              specRow?.id ?? null,
              doc.degree ?? '',
              doc.experience ?? '',
              doc.about ?? '',
              doc.available ?? true,
              doc.fees ?? 0,
              doc.address?.line1 ?? '',
              doc.address?.line2 ?? '',
              doc.date ?? 0,
            ],
          );
          result.migrated++;
        } catch (err) {
          result.errors++;
          const errorMessage = err instanceof Error ? err.message : String(err);
          (result.errorDetails ??= []).push(
            `doctor ${doc._id}: ${errorMessage}`,
          );
        }
      }
    });
  }

  private async migrateDoctorSlots(result: MigrationResult): Promise<void> {
    const docs = await this.doctorModel
      .find({})
      .select('_id slots_booked')
      .lean();

    await this.pg.withTransaction(async (client) => {
      for (const doc of docs) {
        await this.migrateSingleDoctorSlots(client, doc, result);
      }
    });
  }

  async backfillAvailabilityFromDoctors(): Promise<MigrationResult> {
    const result: MigrationResult = {
      collection: 'availability',
      migrated: 0,
      skipped: 0,
      errors: 0,
      durationMs: 0,
    };
    const start = Date.now();
    await this.migrateAvailabilityMongo(result);
    result.durationMs = Date.now() - start;
    return result;
  }

  async migrateMedicalRecords(): Promise<MigrationResult> {
    const result = await backfillMedicalRecords(
      this.appointmentModel,
      this.medicalRecordModel,
    );
    this.logger.log(
      `Medical records backfill: ${result.migrated} migrated, ${result.skipped} skipped, ${result.errors} errors`,
    );
    return result;
  }

  async migratePrescriptions(): Promise<MigrationResult> {
    const result = await backfillPrescriptions(this.prescriptionModel);
    this.logger.log(
      `Prescriptions migration: ${result.migrated} migrated, ${result.skipped} skipped, ${result.errors} errors`,
    );
    return result;
  }

  private async migrateAvailabilityMongo(
    result: MigrationResult,
  ): Promise<void> {
    const BATCH_SIZE = 500;
    let batch: AnyBulkWriteOperation<AvailabilityDocument>[] = [];
    const flush = async (): Promise<void> => {
      if (batch.length === 0) return;
      const ops = batch;
      batch = [];
      try {
        const res = await this.availabilityModel.bulkWrite(ops, {
          ordered: false,
        });
        const ok = (res.upsertedCount ?? 0) + (res.modifiedCount ?? 0);
        result.migrated += ok;
        result.skipped += ops.length - ok;
      } catch (err) {
        const partial = err as {
          result?: { upsertedCount?: number; modifiedCount?: number };
        };
        result.migrated +=
          (partial.result?.upsertedCount ?? 0) +
          (partial.result?.modifiedCount ?? 0);
        result.errors++;
        const msg = err instanceof Error ? err.message : String(err);
        (result.errorDetails ??= []).push(`availability batch: ${msg}`);
        this.logger.error(`availability backfill batch: ${msg}`);
      }
    };
    const cursor = this.doctorModel
      .find({})
      .select('_id slots_booked')
      .lean()
      .cursor();
    for await (const doc of cursor as unknown as AsyncIterable<{
      _id: unknown;
      slots_booked?: Record<string, unknown>;
    }>) {
      const doctorId = String((doc as { _id: unknown })._id);
      const map =
        (doc as { slots_booked?: Record<string, unknown> }).slots_booked ?? {};
      const dates = Object.entries(map);
      if (dates.length === 0) {
        result.skipped++;
        continue;
      }
      for (const [rawDate, times] of dates) {
        if (!Array.isArray(times)) continue;
        const clean = (times as unknown[]).filter(
          (t): t is string => typeof t === 'string' && t.length > 0,
        );
        if (clean.length === 0) continue;
        const date = normalizeSlotDate(rawDate);
        batch.push({
          updateOne: {
            filter: { doctorId, date },
            update: {
              $addToSet: { slots: { $each: clean } },
              $setOnInsert: { doctorId, date },
            },
            upsert: true,
          },
        });
        if (batch.length >= BATCH_SIZE) await flush();
      }
    }
    await flush();
  }

  private async migrateSingleDoctorSlots(
    client: PoolClient,
    doc: { _id: unknown; slots_booked?: Record<string, unknown> },
    result: MigrationResult,
  ): Promise<void> {
    const doctorRow = await this.pg.queryOne<{ id: string }>(
      `SELECT id FROM doctors WHERE mongo_id = $1`,
      [String(doc._id)],
    );

    if (!doctorRow) {
      result.skipped++;
      return;
    }

    const slotsBooked = doc.slots_booked ?? {};

    for (const [slotDate, times] of Object.entries(slotsBooked)) {
      if (!Array.isArray(times)) continue;
      const validTimes = times.filter(
        (time): time is string => typeof time === 'string',
      );
      if (validTimes.length === 0) continue;
      await this.migrateSlotTimes(
        client,
        doctorRow.id,
        slotDate,
        validTimes,
        result,
        String(doc._id),
      );
    }
  }

  private async migrateSlotTimes(
    client: PoolClient,
    doctorPgId: string,
    slotDate: string,
    times: string[],
    result: MigrationResult,
    docMongoId: string,
  ): Promise<void> {
    // un round-trip por fecha en vez de N
    const clean = times.filter(Boolean);
    if (clean.length === 0) return;
    try {
      const res = await client.query(
        `INSERT INTO doctor_slots_booked (doctor_id, slot_date, slot_time)
                SELECT $1, $2, UNNEST($3::text[])
                ON CONFLICT (doctor_id, slot_date, slot_time) DO NOTHING`,
        [doctorPgId, slotDate, clean],
      );
      result.migrated += res.rowCount ?? 0; // solo reales, no conflictos
    } catch (err) {
      result.errors++;
      const msg = err instanceof Error ? err.message : String(err);
      (result.errorDetails ??= []).push(
        `slot ${docMongoId}/${slotDate}: ${msg}`,
      );
      if ((result.errorDetails?.length ?? 0) > 50)
        result.errorDetails = result.errorDetails?.slice(0, 50);
    }
  }

  private async migrateAppointments(result: MigrationResult): Promise<void> {
    const docs = await this.appointmentModel.find({}).lean();

    await this.pg.withTransaction(async (client) => {
      for (const doc of docs) {
        try {
          const userRow = await this.pg.queryOne<{ id: string }>(
            `SELECT id FROM users WHERE mongo_id = $1`,
            [doc.userId],
          );
          const doctorRow = await this.pg.queryOne<{ id: string }>(
            `SELECT id FROM doctors WHERE mongo_id = $1`,
            [doc.docId],
          );

          await client.query(
            `INSERT INTO appointments
                            (mongo_id, user_id, doctor_id, user_mongo_id, doctor_mongo_id,
                             slot_date, slot_time, user_data, doc_data,
                             amount, date_ts, cancelled, payment, is_completed)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                         ON CONFLICT (mongo_id) DO UPDATE SET
                            cancelled=EXCLUDED.cancelled, payment=EXCLUDED.payment,
                            is_completed=EXCLUDED.is_completed`,
            [
              String(doc._id),
              userRow?.id ?? null,
              doctorRow?.id ?? null,
              doc.userId ?? '',
              doc.docId ?? '',
              doc.slotDate ?? '',
              doc.slotTime ?? '',
              JSON.stringify(doc.userData ?? {}),
              JSON.stringify(doc.docData ?? {}),
              doc.amount ?? 0,
              doc.date ?? 0,
              doc.cancelled ?? false,
              doc.payment ?? false,
              doc.isCompleted ?? false,
            ],
          );
          result.migrated++;
        } catch (err) {
          result.errors++;
          const errorMessage = err instanceof Error ? err.message : String(err);
          (result.errorDetails ??= []).push(
            `appointment ${doc._id}: ${errorMessage}`,
          );
        }
      }
    });
  }

  private async migrateWaitlist(result: MigrationResult): Promise<void> {
    // Idempotente: asegura índices Mongo y espeja registros a PG si la tabla existe.
    const col = this.connection.collection('waitlists');
    try {
      await col.createIndex({ doctorId: 1, slotDateKey: 1, createdAt: 1 });
      await col.createIndex({ userId: 1, createdAt: -1 });
      await col.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`waitlist ensureIndex skipped: ${msg}`);
    }
    const docs = (await col.find({}).toArray()) as unknown as WaitlistRawDoc[];
    await this.pg.withTransaction(async (client) => {
      for (const doc of docs) {
        // Savepoint por fila: en PG un INSERT fallido aborta toda la tx,
        // sin esto las filas siguientes contarían como errores en cascada.
        await client.query('SAVEPOINT waitlist_row');
        try {
          await client.query(
            `INSERT INTO waitlist (mongo_id, doctor_mongo_id, user_mongo_id, slot_date_key, slot_time, status)
             VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (mongo_id) DO UPDATE SET status=EXCLUDED.status`,
            [
              String(doc['_id']),
              toWaitlistStr(doc.doctorId),
              toWaitlistStr(doc.userId),
              toWaitlistStr(doc.slotDateKey),
              toWaitlistStr(doc.slotTime),
              toWaitlistStr(doc.status, 'waiting'),
            ],
          );
          await client.query('RELEASE SAVEPOINT waitlist_row');
          result.migrated++;
        } catch (err) {
          // Si la tabla PG aún no existe (DDL pendiente), cuenta como skipped, no error fatal.
          await client.query('ROLLBACK TO SAVEPOINT waitlist_row');
          const msg = err instanceof Error ? err.message : String(err);
          if (/relation .* does not exist/i.test(msg)) {
            result.skipped++;
          } else {
            result.errors++;
            (result.errorDetails ??= []).push(
              `waitlist ${String(doc['_id'])}: ${msg}`,
            );
          }
        }
      }
    });
  }

  private async migrateReferrals(result: MigrationResult): Promise<void> {
    const col = this.connection.collection('referrals');
    try {
      await col.createIndex({ toDoctorId: 1 });
      await col.createIndex({ fromDoctorId: 1 });
      await col.createIndex({ fromDoctorId: 1, toDoctorId: 1 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`referrals ensureIndex skipped: ${msg}`);
    }
    const docs = await this.referralModel.find({}).lean();
    await this.pg.withTransaction(async (client) => {
      for (const doc of docs) {
        await client.query('SAVEPOINT referral_row');
        try {
          await client.query(
            `INSERT INTO referrals (mongo_id, from_mongo_id, to_mongo_id, reason)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (mongo_id) DO UPDATE SET reason=EXCLUDED.reason`,
            [
              String(doc._id),
              String(doc.fromDoctorId),
              String(doc.toDoctorId),
              doc.reason ?? '',
            ],
          );
          await client.query('RELEASE SAVEPOINT referral_row');
          result.migrated++;
        } catch (err) {
          await client.query('ROLLBACK TO SAVEPOINT referral_row');
          const msg = err instanceof Error ? err.message : String(err);
          if (/relation .* does not exist/i.test(msg)) {
            result.skipped++;
          } else {
            result.errors++;
            (result.errorDetails ??= []).push(
              `referral ${String(doc._id)}: ${msg}`,
            );
          }
        }
      }
    });
  }

  private async migrateMonthlyStats(result: MigrationResult): Promise<void> {
    // Lee spill Mongo; si la lectura falla, el error se propaga y queda
    // registrado en el resultado (no se silencian IDs de spill).
    const spillByKey = new Map<string, string[]>();
    const spillCol = this.connection.collection('monthly_stats_patients');
    const spillDocs = await spillCol.find({}).toArray();
    for (const s of spillDocs as Array<{
      docId?: string;
      year?: number;
      month?: number;
      patientId?: string;
    }>) {
      if (!s?.docId || !s?.patientId) continue;
      const key = `${s.docId}|${s.year}|${s.month}`;
      const arr = spillByKey.get(key) ?? [];
      arr.push(s.patientId);
      spillByKey.set(key, arr);
    }

    const docs = await this.statsModel.find({}).lean();

    for (const doc of docs) {
      try {
        await this.pg.withTransaction(async (client) => {
          const res = await client.query(
            `INSERT INTO monthly_stats
                            (mongo_id, doc_id_ref, year, month,
                             total_appointments, completed_appointments,
                             cancelled_appointments, earnings, unique_patients)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                         ON CONFLICT (mongo_id) DO UPDATE SET
                            total_appointments=EXCLUDED.total_appointments,
                            completed_appointments=EXCLUDED.completed_appointments,
                            cancelled_appointments=EXCLUDED.cancelled_appointments,
                            earnings=EXCLUDED.earnings,
                            unique_patients=EXCLUDED.unique_patients,
                            updated_at=now()
                         RETURNING id`,
            [
              String(doc._id),
              doc.docId ?? '',
              doc.year ?? 0,
              doc.month ?? 0,
              doc.totalAppointments ?? 0,
              doc.completedAppointments ?? 0,
              doc.cancelledAppointments ?? 0,
              doc.earnings ?? 0,
              doc.uniquePatients ?? 0,
            ],
          );
          const statsId = res.rows[0].id as string;

          const inlineIds: string[] = (doc.uniquePatientIds ?? []).filter(
            (pid): pid is string => typeof pid === 'string' && pid.length > 0,
          );
          const key = `${doc.docId}|${doc.year}|${doc.month}`;
          const spillIds = (spillByKey.get(key) ?? []).filter(Boolean);
          const allIds = [...inlineIds, ...spillIds];

          // Batch UNNEST en chunks idempotentes (ON CONFLICT DO NOTHING).
          for (let i = 0; i < allIds.length; i += SPILL_BATCH) {
            const chunk = allIds.slice(i, i + SPILL_BATCH);
            if (chunk.length === 0) continue;
            await client.query(
              `INSERT INTO monthly_stats_patients (stats_id, patient_id)
               SELECT $1, UNNEST($2::text[])
               ON CONFLICT (stats_id, patient_id) DO NOTHING`,
              [statsId, chunk],
            );
          }
        });
        result.migrated++;
      } catch (err) {
        result.errors++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        (result.errorDetails ??= []).push(`stats ${doc._id}: ${errorMessage}`);
      }
    }
  }

  private async migratePasswordResetTokens(
    result: MigrationResult,
  ): Promise<void> {
    const docs = await this.tokenModel.find({}).lean();

    await this.pg.withTransaction(async (client) => {
      for (const doc of docs) {
        try {
          await client.query(
            `INSERT INTO password_reset_tokens
                            (mongo_id, user_id, role, token_hash, expires_at, used)
                         VALUES ($1,$2,$3,$4,$5,$6)
                          ON CONFLICT (mongo_id) DO UPDATE SET used=EXCLUDED.used`,
            [
              String(doc._id),
              doc.userId ?? '',
              doc.role ?? 'user',
              doc.tokenHash ?? '',
              doc.expiresAt,
              doc.used ?? false,
            ],
          );
          result.migrated++;
        } catch (err) {
          result.errors++;
          const errorMessage = err instanceof Error ? err.message : String(err);
          (result.errorDetails ??= []).push(
            `token ${doc._id}: ${errorMessage}`,
          );
        }
      }
    });
  }

  private async migrateConversations(result: MigrationResult): Promise<void> {
    const db = this.connection.db;
    if (!db) {
      this.logger.warn('No DB connection available for conversations');
      result.skipped++;
      return;
    }

    const conversations = await db
      .collection('conversations')
      .find({})
      .toArray();
    if (conversations.length === 0) {
      this.logger.log('No conversations found, skipping');
      return;
    }

    for (const conv of conversations) {
      try {
        await this.pg.withTransaction(async (client) => {
          await client.query(
            `INSERT INTO conversations
                            (mongo_id, user_id, status, created_at, updated_at)
                         VALUES ($1,$2,$3,$4,$5)
                         ON CONFLICT (mongo_id) DO UPDATE SET
                            status=EXCLUDED.status, updated_at=EXCLUDED.updated_at
                         RETURNING id`,
            [
              String(conv._id),
              conv.userId ?? conv.user_id ?? '',
              conv.status ?? 'open',
              conv.createdAt ?? conv.created_at ?? new Date(),
              conv.updatedAt ?? conv.updated_at ?? new Date(),
            ],
          );

          const messages: any[] = conv.messages ?? [];
          for (const msg of messages) {
            const convRow = await this.pg.queryOne<{ id: string }>(
              `SELECT id FROM conversations WHERE mongo_id = $1`,
              [String(conv._id)],
            );
            if (!convRow) continue;

            await client.query(
              `INSERT INTO conversation_messages
                                (mongo_id, conversation_id, sender, content, options, metadata, created_at)
                             VALUES ($1,$2,$3,$4,$5,$6,$7)
                             ON CONFLICT (mongo_id) DO NOTHING`,
              [
                msg._id ? String(msg._id) : null,
                convRow.id,
                msg.sender ?? 'bot',
                msg.content ?? '',
                JSON.stringify(msg.options ?? []),
                JSON.stringify(msg.metadata ?? {}),
                msg.createdAt ?? msg.created_at ?? new Date(),
              ],
            );
          }
        });
        result.migrated++;
      } catch (err) {
        result.errors++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        (result.errorDetails ??= []).push(
          `conversation ${conv._id}: ${errorMessage}`,
        );
      }
    }
  }

  async getStatus(): Promise<{
    postgres: boolean;
    tableCounts: Record<string, number>;
  }> {
    const pgOk = await this.pg.testConnection();
    if (!pgOk) return { postgres: false, tableCounts: {} };

    const tables = [
      'users',
      'specialities',
      'doctors',
      'doctor_slots_booked',
      'appointments',
      'waitlist',
      'monthly_stats',
      'monthly_stats_patients',
      'password_reset_tokens',
      'conversations',
      'conversation_messages',
      'referrals',
    ];

    const tableCounts: Record<string, number> = {};
    for (const t of tables) {
      try {
        const row = await this.pg.queryOne<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM ${t}`,
        );
        tableCounts[t] = parseInt(row?.count ?? '0', 10);
      } catch {
        tableCounts[t] = -1;
      }
    }
    return { postgres: pgOk, tableCounts };
  }
}
