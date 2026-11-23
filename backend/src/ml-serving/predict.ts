import 'dotenv/config';
import { resolve } from 'node:path';
import mongoose, { mongo } from 'mongoose';
import { mongoUri, parseArgs } from './cli';
import { loadGrantedMlConsentUserIds } from './consent-gate';
import {
  emptyHistory,
  historyFeatures,
  leadTimeDays,
  observe,
  timeBand,
  weekdayOf,
  type HistoryState,
} from './features/feature-engineering';
import { loadArtifact, scoreRow } from './score';
import { slotDateTime } from '../shared/utils/slot-generator.util';
import { readFileSync } from 'node:fs';

interface SignedMetrics {
  deployable: boolean;
  signOff?: { approvedBy?: string | null };
}

async function main(): Promise<void> {
  const args = parseArgs();
  const registry = resolve(
    process.cwd(),
    args.get('--registry') ?? '../ml/registry',
  );
  const horizonHours = args.num('--horizon-hours', 48);

  // La firma humana ES el gate de deploy: sin ella no se puntúa.
  const metrics = JSON.parse(
    readFileSync(`${registry}/metrics.json`, 'utf8'),
  ) as SignedMetrics;
  if (!metrics.deployable || !metrics.signOff?.approvedBy) {
    console.error(
      'metrics.json sin deployable=true o sin signOff.approvedBy. No se predice.',
    );
    process.exit(2);
  }

  const driver = process.env.ML_REMINDER_DRIVER ?? 'log-only';
  if (driver !== 'log-only') {
    console.warn(
      `ML_REMINDER_DRIVER=${driver} no implementado en v0.1.0; se sigue en log-only.`,
    );
  }

  const artifact = loadArtifact(`${registry}/model-v0.1.0.json`);

  await mongoose.connect(mongoUri(args.get('--db')));
  const db = mongoose.connection.db as mongo.Db;
  const granted = await loadGrantedMlConsentUserIds(db);

  // ponytail: escaneo acotado; añadir índice por slotEpoch si crece >>50k docs.
  const docs = await db
    .collection('appointments')
    .find({})
    .limit(20000)
    .toArray();
  const history = new Map<string, HistoryState>();
  for (const doc of docs) {
    const userId = String(doc.userId);
    const state = history.get(userId) ?? emptyHistory();
    observe(state, { cancelled: Boolean(doc.cancelled), noShow: false });
    history.set(userId, state);
  }

  const now = Date.now();
  const horizon = now + horizonHours * 3_600_000;
  let scored = 0;
  let flagged = 0;

  for (const doc of docs) {
    const scheduledAt = slotDateTime(
      String(doc.slotDate),
      String(doc.slotTime),
    );
    const time = scheduledAt.getTime();
    if (Number.isNaN(time) || time < now || time > horizon) continue;
    if (doc.cancelled || doc.isCompleted) continue;

    const userId = String(doc.userId);
    if (!granted.has(userId)) continue; // consentimiento revocado post-dataset

    const probability = scoreRow(artifact, {
      timeBand: timeBand(scheduledAt),
      weekday: weekdayOf(scheduledAt),
      leadTimeDays: leadTimeDays(Number(doc.date), scheduledAt),
      ...historyFeatures(history.get(userId) ?? emptyHistory()),
    });

    scored += 1;
    const above = probability >= artifact.threshold;
    if (above) flagged += 1;
    console.log(
      `ml.predict appointmentId=${String(doc._id)} band=${timeBand(scheduledAt)} ` +
        `p=${probability.toFixed(4)} above=${above ? 1 : 0}`,
    );
  }

  console.log(
    `Scored ${scored} citas en ${horizonHours}h, flagged=${flagged} (driver=${driver}).`,
  );
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
