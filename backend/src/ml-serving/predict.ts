import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import mongoose, { mongo } from 'mongoose';
import { mongoUri, parseArgs } from './cli';
import { loadGrantedMlConsentUserIds } from './consent-gate';
import {
  DEFAULT_HORIZON_HOURS,
  HOUR_MS,
  emptyHistory,
  historyFeatures,
  leadTimeDays,
  observe,
  outcomeOf,
  resolvedAtMs,
  timeBand,
  weekdayOf,
  type HistoryState,
} from './features/feature-engineering';
import { loadArtifact, scoreRow } from './score';
import { slotDateTime } from '../shared/utils/slot-generator.util';

interface SignedMetrics {
  deployable: boolean;
  signOff?: { approvedBy?: string | null };
}

async function main(): Promise<void> {
  // El driver ES el gate: sin log-only explícito no se toca ni artefacto ni BD.
  const driver = process.env.ML_REMINDER_DRIVER;
  if (driver !== 'log-only') {
    console.error(
      `ML_REMINDER_DRIVER=${driver ?? '(unset)'} no soportado en v0.1.0 (solo log-only). No se predice.`,
    );
    process.exit(2);
  }

  const args = parseArgs();
  const registry = resolve(
    process.cwd(),
    args.get('--registry') ?? '../ml/registry',
  );
  const horizonHours = args.num('--horizon-hours', DEFAULT_HORIZON_HOURS);

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

  const artifact = loadArtifact(`${registry}/model-v0.1.0.json`);

  await mongoose.connect(mongoUri(args.get('--db')));
  const db = mongoose.connection.db as mongo.Db;
  const granted = await loadGrantedMlConsentUserIds(db);
  const appointments = db.collection('appointments');
  // Un único `now`: historial y horizonte ven la misma foto del mundo.
  const now = Date.now();

  // Historial con el MISMO criterio que toFeatureRows: por paciente, solo
  // desenlaces ya resueltos antes de `now`, sin sintéticas ni sin consentimiento.
  const history = new Map<string, HistoryState>();
  for await (const doc of appointments.find({})) {
    const userId = String(doc.userId);
    if (doc.isSynthetic) continue;
    if (!granted.has(userId)) continue;
    const input = {
      cancelled: Boolean(doc.cancelled),
      cancelledAt: (doc.cancelledAt as number | null | undefined) ?? null,
      isCompleted: Boolean(doc.isCompleted),
      scheduledAt: slotDateTime(String(doc.slotDate), String(doc.slotTime)),
    };
    if (Number.isNaN(input.scheduledAt.getTime())) continue;
    const outcome = outcomeOf(input, now);
    if (outcome === null || resolvedAtMs(input) > now) continue;
    const state = history.get(userId) ?? emptyHistory();
    observe(state, outcome);
    history.set(userId, state);
  }

  // Candidatos en consulta aparte: sin `limit`, para no descartar citas
  // elegibles antes de aplicar el horizonte.
  const horizon = now + horizonHours * HOUR_MS;
  let scored = 0;
  let flagged = 0;

  const candidates = appointments.find({
    cancelled: { $ne: true },
    isCompleted: { $ne: true },
  });
  for await (const doc of candidates) {
    if (doc.isSynthetic) continue;
    const userId = String(doc.userId);
    if (!granted.has(userId)) continue; // consentimiento revocado post-dataset

    const scheduledAt = slotDateTime(
      String(doc.slotDate),
      String(doc.slotTime),
    );
    const time = scheduledAt.getTime();
    if (Number.isNaN(time) || time < now || time > horizon) continue;

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
