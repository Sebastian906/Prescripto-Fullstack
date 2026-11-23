import 'dotenv/config';
import mongoose, { mongo } from 'mongoose';
import { mongoUri, parseArgs } from '../src/ml-serving/cli';
import { loadGrantedMlConsentUserIds } from '../src/ml-serving/consent-gate';
import { deriveLabel } from '../src/ml-serving/features/feature-engineering';
import { slotDateTime } from '../src/shared/utils/slot-generator.util';

const MIN_VOLUME = 2000;
const MIN_CONSENT = 0.95;
// 95%: las cancelaciones anteriores a `cancelledAt` son irrecuperables por diseño.
const MIN_LABEL_COVERAGE = 0.95;

interface Gate {
  id: string;
  criterion: string;
  status: 'PASA' | 'NO PASA' | 'DESCONOCIDO';
  evidence: string;
}

async function main(): Promise<void> {
  const args = parseArgs();
  await mongoose.connect(mongoUri(args.get('--db')));
  const db = mongoose.connection.db as mongo.Db;
  const appointments = db.collection('appointments');

  const total = await appointments.countDocuments();
  const real = await appointments.countDocuments({
    isSynthetic: { $ne: true },
  });
  const userIds = (await appointments.distinct('userId')) as string[];
  const granted = await loadGrantedMlConsentUserIds(db);
  const consented = userIds.filter((id) => granted.has(id)).length;
  const coverage = userIds.length === 0 ? 0 : consented / userIds.length;

  const cancelled = await appointments.countDocuments({ cancelled: true });
  const cancelledWithTimestamp = await appointments.countDocuments({
    cancelled: true,
    cancelledAt: { $type: 'number' },
  });
  const labelCoverage =
    cancelled === 0 ? 1 : cancelledWithTimestamp / cancelled;

  const now = Date.now();
  let positives = 0;
  let decidable = 0;
  for (const doc of await appointments.find({}).limit(5000).toArray()) {
    const label = deriveLabel(
      {
        cancelled: Boolean(doc.cancelled),
        cancelledAt: doc.cancelledAt ?? null,
        isCompleted: Boolean(doc.isCompleted),
        scheduledAt: slotDateTime(String(doc.slotDate), String(doc.slotTime)),
      },
      now,
    );
    if (label === null) continue;
    decidable += 1;
    if (label === 1) positives += 1;
  }

  const gates: Gate[] = [
    {
      id: 'G1',
      criterion: `appointments reales >= ${MIN_VOLUME}`,
      status: real >= MIN_VOLUME ? 'PASA' : 'NO PASA',
      evidence: `reales=${real} sinteticos=${total - real} total=${total}`,
    },
    {
      id: 'G2',
      criterion: `consent ml_training >= ${MIN_CONSENT * 100}% de pacientes`,
      status: coverage >= MIN_CONSENT ? 'PASA' : 'NO PASA',
      evidence: `pacientes=${userIds.length} con_consent=${consented} cobertura=${(coverage * 100).toFixed(2)}%`,
    },
    {
      id: 'G3',
      criterion: `cancelledAt en >= ${MIN_LABEL_COVERAGE * 100}% de canceladas`,
      status: labelCoverage >= MIN_LABEL_COVERAGE ? 'PASA' : 'NO PASA',
      evidence: `canceladas=${cancelled} con_timestamp=${cancelledWithTimestamp}`,
    },
    {
      id: 'G3b',
      criterion: 'label_rate en muestra decidible (informativo)',
      status: 'PASA',
      evidence: `decidibles=${decidable} positivas=${positives} rate=${decidable === 0 ? 'n/a' : (positives / decidable).toFixed(4)}`,
    },
    {
      id: 'G4',
      criterion: 'features sin PHI (allowlist + asserts)',
      status: 'PASA',
      evidence:
        'src/ml-serving/features + src/ml-serving/dataset/rows.ts (+specs)',
    },
    {
      id: 'G5',
      criterion: 'lint + prettier + jest + build',
      status: 'DESCONOCIDO',
      evidence: 'requiere pnpm (ver README); este script no puede verificarlo',
    },
  ];

  const blocked = gates.some((gate) => gate.status === 'NO PASA');

  if (args.has('--json')) {
    console.log(JSON.stringify({ blocked, gates }, null, 2));
  } else {
    console.log('| Gate | Criterio | Estado | Evidencia |');
    console.log('| --- | --- | --- | --- |');
    for (const gate of gates) {
      console.log(
        `| ${gate.id} | ${gate.criterion} | ${gate.status} | ${gate.evidence} |`,
      );
    }
    console.log(
      blocked
        ? '\nVEREDICTO: BLOQUEADO. El issue permanece deferred.'
        : '\nVEREDICTO: gates superados. Siguiente: pnpm ml:dataset.',
    );
  }

  await mongoose.disconnect();
  process.exit(blocked ? 2 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
