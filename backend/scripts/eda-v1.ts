import 'dotenv/config';
import mongoose, { mongo } from 'mongoose';
import { DEFAULT_PHONE_REGION } from '../src/shared/utils/validators';
import {
  FieldCounts,
  assertNoLoss,
  decideFields,
  emptyCounts,
  tally,
} from './lib/field-audit';

type CollectionName = 'users' | 'appointments';

const K = 5;

interface FieldStats {
  counts: FieldCounts;
  distribution: Map<string, number>;
  dirtyDefaults: number;
  plausibleAge: number;
}

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const getArg = (name: string): string | undefined => {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const hasFlag = (name: string): boolean => args.includes(name);

const asJson = hasFlag('--json');
const source = (getArg('--source') ?? 'users') as CollectionName;
const out = getArg('--out');
const defaultRegion = getArg('--default-region') ?? DEFAULT_PHONE_REGION;
const limit = Number(getArg('--limit') ?? 0) || 0;

if (!['users', 'appointments'].includes(source)) {
  console.error('--source debe ser users | appointments');
  process.exit(2);
}
if (!process.env.MONGODB_URI) {
  console.error('Falta MONGODB_URI en el entorno');
  process.exit(2);
}

function newStats(): FieldStats {
  return {
    counts: emptyCounts(),
    distribution: new Map(),
    dirtyDefaults: 0,
    plausibleAge: 0,
  };
}

function ageFromIso(iso: string): number | null {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - year;
  const beforeBirthday =
    today.getUTCMonth() + 1 < month ||
    (today.getUTCMonth() + 1 === month && today.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

function add(
  map: Map<string, number>,
  key: string | null | undefined,
): void {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function suppress(map: Map<string, number>): Record<string, number | '<5'> {
  const result: Record<string, number | '<5'> = {};
  for (const [key, value] of [...map.entries()].sort((a, b) => b[1] - a[1])) {
    result[key] = value < K ? '<5' : value;
  }
  return result;
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(4));
}

function consistency(counts: FieldCounts): number {
  return ratio(
    counts.keep + counts.write - counts.blank,
    counts.total - counts.blank,
  );
}

async function main(): Promise<void> {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db as mongo.Db;
  const col = db.collection(source);
  const projection: Record<string, 1> =
    source === 'users'
      ? { phone: 1, gender: 1, dob: 1 }
      : { userData: 1 };
  const cursor = col.find({}, { projection }).batchSize(500);
  if (limit > 0) cursor.limit(limit);

  const phone = newStats();
  const gender = newStats();
  const dob = newStats();
  let scanned = 0;
  let malformed = 0;

  for await (const doc of cursor) {
    scanned += 1;
    const raw =
      source === 'users'
        ? (doc as unknown as Record<string, any>)
        : (doc.userData as Record<string, any> | undefined);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      malformed += 1;
      continue;
    }

    const decisions = decideFields(raw, defaultRegion);
    tally(phone.counts, decisions.phone);
    tally(gender.counts, decisions.gender);
    tally(dob.counts, decisions.dob);

    if (decisions.phone.kind !== 'quarantine') {
      add(phone.distribution, decisions.phone.next ? decisions.phone.next.slice(0, 3) : null);
    }
    if (decisions.gender.kind !== 'quarantine') {
      add(gender.distribution, decisions.gender.next);
    }
    if (decisions.dob.kind !== 'quarantine' && decisions.dob.next) {
      const year = Number(decisions.dob.next.slice(0, 4));
      if (year) add(dob.distribution, `${year - (year % 10)}s`);
      const age = ageFromIso(decisions.dob.next);
      if (age !== null && age >= 0 && age <= 120) dob.plausibleAge += 1;
    }

    if (raw.phone === '0000000000') phone.dirtyDefaults += 1;
    if (raw.gender === 'Not Selected') gender.dirtyDefaults += 1;
    if (raw.dob === 'Not Selected') dob.dirtyDefaults += 1;
  }

  assertNoLoss(`${source}.phone`, phone.counts);
  assertNoLoss(`${source}.gender`, gender.counts);
  assertNoLoss(`${source}.dob`, dob.counts);

  const report = {
    generatedAt: new Date().toISOString(),
    source,
    k: K,
    scanned,
    malformed,
    phone: {
      ...phone.counts,
      completeness: ratio(phone.counts.total - phone.counts.blank, phone.counts.total),
      consistency: consistency(phone.counts),
      dirtyDefaults: phone.dirtyDefaults,
      distribution: suppress(phone.distribution),
    },
    gender: {
      ...gender.counts,
      completeness: ratio(
        gender.counts.total - gender.counts.blank,
        gender.counts.total,
      ),
      consistency: consistency(gender.counts),
      dirtyDefaults: gender.dirtyDefaults,
      distribution: suppress(gender.distribution),
    },
    dob: {
      ...dob.counts,
      completeness: ratio(dob.counts.total - dob.counts.blank, dob.counts.total),
      consistency: consistency(dob.counts),
      accuracyProxy: ratio(
        dob.plausibleAge,
        dob.counts.total - dob.counts.blank,
      ),
      dirtyDefaults: dob.dirtyDefaults,
      distribution: suppress(dob.distribution),
    },
  };

  const text = asJson
    ? JSON.stringify(report, null, 2)
    : [
        `# EDA v1 — ${source}`,
        '',
        `Generado: ${report.generatedAt}`,
        `Filas escaneadas: ${scanned} (malformed: ${malformed})`,
        `Supresión: k=${K}`,
        '',
        '| campo | total | blank | completeness | consistency | dirty default |',
        '| --- | ---: | ---: | ---: | ---: | ---: |',
        `| phone | ${report.phone.total} | ${report.phone.blank} | ${report.phone.completeness} | ${report.phone.consistency} | ${report.phone.dirtyDefaults} |`,
        `| gender | ${report.gender.total} | ${report.gender.blank} | ${report.gender.completeness} | ${report.gender.consistency} | ${report.gender.dirtyDefaults} |`,
        `| dob | ${report.dob.total} | ${report.dob.blank} | ${report.dob.completeness} | ${report.dob.consistency} | ${report.dob.dirtyDefaults} |`,
        '',
        `- dob.accuracyProxy (edad 0–120): ${report.dob.accuracyProxy}`,
        '',
        '## Distribuciones',
        '',
        `- phone (prefijo): ${JSON.stringify(report.phone.distribution)}`,
        `- gender: ${JSON.stringify(report.gender.distribution)}`,
        `- dob (década): ${JSON.stringify(report.dob.distribution)}`,
        '',
        '_Sin IDs, sin filas crudas, celdas <5 suprimidas._',
        '',
      ].join('\n');

  if (out) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(out, text, 'utf8');
    console.log(`EDA escrita en ${out}`);
  } else {
    console.log(text);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
