import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Appointment, AppointmentDocument } from 'src/appointments/schemas/appointment.schema';
import { PasswordResetToken, PasswordResetTokenDocument } from 'src/auth/password-reset-token.schema';
import { Doctor, DoctorDocument } from 'src/doctors/schemas/doctor.schema';
import { MonthlyStats, MonthlyStatsDocument } from 'src/reports/schemas/monthly-stats.schema';
import { Speciality, SpecialityDocument } from 'src/specialities/schemas/speciality.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { PostgresService } from './postgres.service';
import { PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

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

@Injectable()
export class MigrationService {
    private readonly logger = new Logger(MigrationService.name);

    constructor(
        @InjectModel(Doctor.name) private readonly doctorModel: Model<DoctorDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        @InjectModel(Appointment.name) private readonly appointmentModel: Model<AppointmentDocument>,
        @InjectModel(Speciality.name) private readonly specialityModel: Model<SpecialityDocument>,
        @InjectModel(MonthlyStats.name) private readonly statsModel: Model<MonthlyStatsDocument>,
        @InjectModel(PasswordResetToken.name) private readonly tokenModel: Model<PasswordResetTokenDocument>,
        @InjectConnection() private readonly connection: Connection,
        private readonly pg: PostgresService,
    ) { }

    async runFullMigration(options: {
        dropAndRecreate?: boolean;
        collections?: string[];
    } = {}): Promise<MigrationReport> {
        const startedAt = new Date();
        this.logger.log('Starting full migration MongoDB → PostgreSQL');

        const schemaCreated = await this.ensureSchema(options.dropAndRecreate ?? false);

        const collections = options.collections ?? [
            'users', 'specialities', 'doctors', 'slots',
            'appointments', 'monthly_stats', 'password_reset_tokens', 'conversations',
        ];

        const results: MigrationResult[] = [];

        for (const col of collections) {
            this.logger.log(`Migrating: ${col}`);
            const result = await this.migrateCollection(col);
            results.push(result);
            this.logger.log(
                `  ✓ ${result.migrated} migrated, ${result.skipped} skipped, ${result.errors} errors (${result.durationMs}ms)`
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

            const sqlPath = path.join(process.cwd(), 'dist', 'migration', 'sql', '001_create_schema.sql');
            const sql = fs.readFileSync(sqlPath, 'utf8');

            const statements = sql
                .split('\n')
                .filter(line => !line.trim().startsWith('--'))
                .join('\n')
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            for (const stmt of statements) {
                await this.pg.query(stmt);
            }

            this.logger.log('Schema created/verified successfully');
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error('Schema creation failed', message);
            throw err;
        }
    }

    private async dropAllTables(): Promise<void> {
        const tables = [
            'conversation_messages', 'conversations',
            'monthly_stats_patients', 'monthly_stats',
            'password_reset_tokens',
            'doctor_slots_booked', 'appointments',
            'doctors', 'specialities', 'users',
        ];
        for (const t of tables) {
            await this.pg.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
        }
        this.logger.warn('All tables dropped');
    }

    async migrateCollection(name: string): Promise<MigrationResult> {
        const start = Date.now();
        const result: MigrationResult = { collection: name, migrated: 0, skipped: 0, errors: 0, durationMs: 0 };
        try {
            switch (name) {
                case 'users': await this.migrateUsers(result); break;
                case 'specialities': await this.migrateSpecialities(result); break;
                case 'doctors': await this.migrateDoctors(result); break;
                case 'slots': await this.migrateDoctorSlots(result); break;
                case 'appointments': await this.migrateAppointments(result); break;
                case 'monthly_stats': await this.migrateMonthlyStats(result); break;
                case 'password_reset_tokens': await this.migratePasswordResetTokens(result); break;
                case 'conversations': await this.migrateConversations(result); break;
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
                        ]
                    );
                    result.migrated++;
                } catch (err) {
                    result.errors++;
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    result.errorDetails = [...(result.errorDetails ?? []), `user ${doc._id}: ${errorMessage}`];
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
                        ]
                    );
                    result.migrated++;
                } catch (err) {
                    result.errors++;
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    result.errorDetails = [...(result.errorDetails ?? []), `speciality ${doc._id}: ${errorMessage}`];
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
                        [doc.speciality]
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
                        ]
                    );
                    result.migrated++;
                } catch (err) {
                    result.errors++;
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    result.errorDetails = [...(result.errorDetails ?? []), `doctor ${doc._id}: ${errorMessage}`];
                }
            }
        });
    }

    private async migrateDoctorSlots(result: MigrationResult): Promise<void> {
        const docs = await this.doctorModel.find({}).select('_id slots_booked').lean();

        await this.pg.withTransaction(async (client) => {
            for (const doc of docs) {
                await this.migrateSingleDoctorSlots(client, doc, result);
            }
        });
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
            const validTimes = times.filter((time): time is string => typeof time === 'string');
            if (validTimes.length === 0) continue;
            await this.migrateSlotTimes(client, doctorRow.id, slotDate, validTimes, result, String(doc._id));
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
        for (const slotTime of times) {
            if (!slotTime) continue;
            try {
                await client.query(
                    `INSERT INTO doctor_slots_booked (doctor_id, slot_date, slot_time)
                 VALUES ($1,$2,$3)
                 ON CONFLICT (doctor_id, slot_date, slot_time) DO NOTHING`,
                    [doctorPgId, slotDate, slotTime],
                );
                result.migrated++;
            } catch (err) {
                result.errors++;
                const errorMessage = err instanceof Error ? err.message : String(err);
                result.errorDetails = [
                    ...(result.errorDetails ?? []),
                    `slot ${docMongoId}/${slotDate}/${slotTime}: ${errorMessage}`,
                ];
            }
        }
    }

    private async migrateAppointments(result: MigrationResult): Promise<void> {
        const docs = await this.appointmentModel.find({}).lean();

        await this.pg.withTransaction(async (client) => {
            for (const doc of docs) {
                try {
                    const userRow = await this.pg.queryOne<{ id: string }>(
                        `SELECT id FROM users WHERE mongo_id = $1`, [doc.userId]
                    );
                    const doctorRow = await this.pg.queryOne<{ id: string }>(
                        `SELECT id FROM doctors WHERE mongo_id = $1`, [doc.docId]
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
                        ]
                    );
                    result.migrated++;
                } catch (err) {
                    result.errors++;
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    result.errorDetails = [...(result.errorDetails ?? []), `appointment ${doc._id}: ${errorMessage}`];
                }
            }
        });
    }

    private async migrateMonthlyStats(result: MigrationResult): Promise<void> {
        const docs = await this.statsModel.find({}).lean();

        for (const doc of docs) {
            try {
                await this.pg.withTransaction(async (client) => {
                    const result = await client.query(
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
                        ]
                    );
                    const statsId = result.rows[0].id;

                    const patientIds: string[] = doc.uniquePatientIds ?? [];
                    for (const pid of patientIds) {
                        if (!pid) continue;
                        await client.query(
                            `INSERT INTO monthly_stats_patients (stats_id, patient_id)
                             VALUES ($1,$2)
                             ON CONFLICT (stats_id, patient_id) DO NOTHING`,
                            [statsId, pid]
                        );
                    }
                });
                result.migrated++;
            } catch (err) {
                result.errors++;
                const errorMessage = err instanceof Error ? err.message : String(err);
                result.errorDetails = [...(result.errorDetails ?? []), `stats ${doc._id}: ${errorMessage}`];
            }
        }
    }

    private async migratePasswordResetTokens(result: MigrationResult): Promise<void> {
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
                        ]
                    );
                    result.migrated++;
                } catch (err) {
                    result.errors++;
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    result.errorDetails = [...(result.errorDetails ?? []), `token ${doc._id}: ${errorMessage}`];
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

        const conversations = await db.collection('conversations').find({}).toArray();
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
                        ]
                    );

                    const messages: any[] = conv.messages ?? [];
                    for (const msg of messages) {
                        const convRow = await this.pg.queryOne<{ id: string }>(
                            `SELECT id FROM conversations WHERE mongo_id = $1`, [String(conv._id)]
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
                            ]
                        );
                    }
                });
                result.migrated++;
            } catch (err) {
                result.errors++;
                const errorMessage = err instanceof Error ? err.message : String(err);
                result.errorDetails = [...(result.errorDetails ?? []), `conversation ${conv._id}: ${errorMessage}`];
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
            'users', 'specialities', 'doctors', 'doctor_slots_booked',
            'appointments', 'monthly_stats', 'monthly_stats_patients',
            'password_reset_tokens', 'conversations', 'conversation_messages',
        ];

        const tableCounts: Record<string, number> = {};
        for (const t of tables) {
            try {
                const row = await this.pg.queryOne<{ count: string }>(
                    `SELECT COUNT(*)::text as count FROM ${t}`
                );
                tableCounts[t] = parseInt(row?.count ?? '0', 10);
            } catch {
                tableCounts[t] = -1;
            }
        }
        return { postgres: pgOk, tableCounts };
    }
}
