import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import mongoose, { mongo } from 'mongoose';
import { mongoUri, parseArgs, sha256Hex } from '../cli';
import { loadGrantedMlConsentUserIds } from '../consent-gate';
import type { DatasetManifest } from '../types';
import { toFeatureRows, type RawAppointment } from './rows';

const MIN_CONSENT_COVERAGE = 0.95;
const PROJECTION = {
  userId: 1,
  slotDate: 1,
  slotTime: 1,
  date: 1,
  cancelled: 1,
  cancelledAt: 1,
  isCompleted: 1,
  isSynthetic: 1,
} as const;

async function main(): Promise<void> {
  const args = parseArgs();
  const version = args.get('--version') ?? 'v0.1.0';
  const out = resolve(
    process.cwd(),
    args.get('--out') ?? '../ml/registry/dataset-v0.1.0.jsonl',
  );
  const includeSynthetic = args.has('--include-synthetic');
  const allowPartial = args.has('--allow-partial-consent');

  await mongoose.connect(mongoUri(args.get('--db')));
  const db = mongoose.connection.db as mongo.Db;

  const granted = await loadGrantedMlConsentUserIds(db);
  const docs = (await db
    .collection('appointments')
    .find({}, { projection: PROJECTION })
    .toArray()) as unknown as RawAppointment[];

  const patients = new Set(docs.map((doc) => String(doc.userId)));
  const consented = [...patients].filter((id) => granted.has(id)).length;
  const consentCoverage = patients.size === 0 ? 0 : consented / patients.size;

  if (consentCoverage < MIN_CONSENT_COVERAGE && !allowPartial) {
    console.error(
      `Gate G2: cobertura de consentimiento ${(consentCoverage * 100).toFixed(2)}% ` +
        `< ${MIN_CONSENT_COVERAGE * 100}%. No se genera dataset.`,
    );
    await mongoose.disconnect();
    process.exit(2);
  }

  const { rows, dropped } = toFeatureRows(docs, granted, {
    now: Date.now(),
    includeSynthetic,
  });
  if (rows.length === 0) {
    console.error('Dataset vacío: revisa G1/G2/G3 con pnpm ml:gates.');
    await mongoose.disconnect();
    process.exit(2);
  }

  const jsonl = `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, jsonl, 'utf8');

  const positives = rows.filter((row) => row.label === 1).length;
  const manifest: DatasetManifest = {
    version,
    sha256: sha256Hex(jsonl),
    nRows: rows.length,
    droppedRows: dropped,
    labelRate: positives / rows.length,
    createdAt: new Date().toISOString(),
    source: includeSynthetic ? 'synthetic' : 'mongo',
    includeSynthetic,
    consentFilter: true,
    consentCoverage,
    notes: [
      `pacientes=${patients.size}`,
      `pacientes_con_consent=${consented}`,
      'features: IDs pseudonimizados + bandas; cero PHI',
    ],
  };
  // Manifest por dataset: dos builds con --out distintos no se pisan.
  const manifestPath = `${out.replace(/\.jsonl?$/i, '')}.manifest.json`;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(
    `${version}: ${rows.length} filas (${dropped} descartadas), ` +
      `label_rate=${manifest.labelRate.toFixed(4)}, ` +
      `consent=${(consentCoverage * 100).toFixed(2)}%, sha256=${manifest.sha256.slice(0, 12)}…`,
  );
  console.log(`Escrito en ${out}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
