import 'dotenv/config';
import mongoose, { mongo } from 'mongoose';
import { mongoUri, parseArgs } from '../src/ml-serving/cli';
import { mulberry32 } from '../src/ml-serving/dataset/random';
import { DAY_MS } from '../src/ml-serving/features/feature-engineering';

const BANDS: Array<{ hour: number; weight: number }> = [
  { hour: 9, weight: 0.4 },
  { hour: 13, weight: 0.3 },
  { hour: 18, weight: 0.2 },
  { hour: 22, weight: 0.1 },
];

function guard(): void {
  if (process.env.NODE_ENV === 'production') {
    console.error('Rechazado: seed bloqueado con NODE_ENV=production');
    process.exit(2);
  }
  if (process.env.ML_SEED_ALLOW !== 'true') {
    console.error('Rechazado: define ML_SEED_ALLOW=true');
    process.exit(2);
  }
}

function slotDateKey(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function slotTimeKey(date: Date): string {
  const hours = date.getHours();
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(date.getMinutes()).padStart(2, '0')} ${meridiem}`;
}

function pickHour(rng: () => number): number {
  const roll = rng();
  let cumulative = 0;
  for (const band of BANDS) {
    cumulative += band.weight;
    if (roll <= cumulative) return band.hour;
  }
  return BANDS[BANDS.length - 1].hour;
}

async function main(): Promise<void> {
  guard();
  const args = parseArgs();
  await mongoose.connect(mongoUri(args.get('--db') ?? 'prescripto_ml_dev'));
  const db = mongoose.connection.db as mongo.Db;

  if (args.has('--purge')) {
    const appointments = await db
      .collection('appointments')
      .deleteMany({ isSynthetic: true });
    const consents = await db
      .collection('consents')
      .deleteMany({ scope: 'ml_training', version: 'seed' });
    console.log(
      `Purge: ${appointments.deletedCount} appointments y ${consents.deletedCount} consents.`,
    );
    await mongoose.disconnect();
    return;
  }

  const n = args.num('--n', 2500);
  const patients = args.num('--patients', 400);
  const pastDays = args.num('--days', 180);
  const withConsent = !args.has('--no-consent');
  const rng = mulberry32(args.num('--seed', 20260101));

  const sampleIds = async (
    collection: string,
    limit: number,
  ): Promise<string[]> => {
    const docs = await db
      .collection(collection)
      .find({}, { projection: { _id: 1 } })
      .limit(limit)
      .toArray();
    return docs.map((doc) => String(doc._id));
  };

  // Pacientes sintéticos propios: nunca se escribe un consent ml_training para
  // un usuario real (ni para los que lo tuvieran revocado).
  const userIds = Array.from({ length: patients }, () =>
    String(new mongoose.Types.ObjectId()),
  );
  const docIds = await sampleIds(
    'doctors',
    Math.max(1, Math.round(patients / 10)),
  );
  if (docIds.length === 0) docIds.push(String(new mongoose.Types.ObjectId()));

  if (withConsent) {
    await db.collection('consents').bulkWrite(
      userIds.map((userId) => ({
        updateOne: {
          filter: { userId, scope: 'ml_training', version: 'seed' },
          update: {
            $set: { status: 'granted', updatedAt: new Date() },
            $setOnInsert: { userId, scope: 'ml_training', version: 'seed' },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }

  const now = Date.now();
  const docs: Record<string, unknown>[] = [];
  for (let i = 0; i < n; i++) {
    const userId = userIds[Math.floor(rng() * userIds.length)];
    const docId = docIds[Math.floor(rng() * docIds.length)];
    const leadDays = Math.floor(rng() * 61);
    const scheduled = new Date(
      now - (Math.floor(rng() * pastDays) + 1) * DAY_MS,
    );
    scheduled.setHours(pickHour(rng), rng() < 0.5 ? 0 : 30, 0, 0);

    const roll = rng();
    let cancelled = false;
    let cancelledAt: number | null = null;
    let isCompleted = false;

    if (roll < 0.55) isCompleted = true;
    else if (roll < 0.75) {
      cancelled = true;
      cancelledAt = scheduled.getTime() - Math.floor(rng() * 24 * 3_600_000);
    } else if (roll < 0.85) {
      cancelled = true;
      cancelledAt = scheduled.getTime() - (2 + Math.floor(rng() * 9)) * DAY_MS;
    }

    docs.push({
      userId,
      docId,
      slotDate: slotDateKey(scheduled),
      slotTime: slotTimeKey(scheduled),
      userData: { _id: userId },
      docData: { _id: docId },
      amount: 100 + Math.floor(rng() * 400),
      date: scheduled.getTime() - leadDays * DAY_MS,
      cancelled,
      cancelledAt,
      cancellationReason: cancelled && rng() < 0.5 ? 'Synthetic' : '',
      payment: isCompleted,
      isCompleted,
      isSynthetic: true,
    });
  }

  for (let start = 0; start < docs.length; start += 500) {
    await db
      .collection('appointments')
      .insertMany(docs.slice(start, start + 500), { ordered: false });
  }

  console.log(
    `Seed: ${docs.length} appointments isSynthetic=true en ${db.databaseName}` +
      (withConsent ? ', con consent ml_training/seed.' : ' sin consents.'),
  );
  // el rollback debe apuntar a la MISMA base, incluida la de por defecto
  console.log(
    `Rollback: pnpm ml:seed -- --purge --db ${JSON.stringify(db.databaseName)}`,
  );
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
