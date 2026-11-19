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

interface Audit {
  phone: FieldCounts;
  gender: FieldCounts;
  dob: FieldCounts;
}

interface QuarantineHit {
  collection: CollectionName;
  id: string;
  field: 'phone' | 'gender' | 'dob';
  reason: string;
}

interface ScanResult {
  audit: Audit;
  quarantine: QuarantineHit[];
  malformed: number;
  scanned: number;
  written: number;
}

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const getArg = (name: string): string | undefined => {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const hasFlag = (name: string): boolean => args.includes(name);

const apply = hasFlag('--apply');
const confirmed = hasFlag('--yes');
const asJson = hasFlag('--json');
const source = getArg('--source') ?? 'both';
const out = getArg('--out');
const defaultRegion = getArg('--default-region') ?? DEFAULT_PHONE_REGION;
const limit = Number(getArg('--limit') ?? 0) || 0;

if (!['users', 'appointments', 'both'].includes(source)) {
  console.error('--source debe ser users | appointments | both');
  process.exit(2);
}
if (apply && !confirmed) {
  console.error('--apply requiere --yes (dry-run por defecto)');
  process.exit(2);
}
if (!process.env.MONGODB_URI) {
  console.error('Falta MONGODB_URI en el entorno');
  process.exit(2);
}

function newAudit(): Audit {
  return { phone: emptyCounts(), gender: emptyCounts(), dob: emptyCounts() };
}

function buildPatch(
  raw: Record<string, any>,
  prefix: '' | 'userData',
  region: string,
): { patch: Record<string, unknown>; decisions: ReturnType<typeof decideFields> } {
  const decisions = decideFields(raw, region);
  const key = prefix ? `${prefix}.` : '';
  const patch: Record<string, unknown> = {};
  if (decisions.phone.kind === 'write') patch[`${key}phone`] = decisions.phone.next;
  if (decisions.gender.kind === 'write') {
    patch[`${key}gender`] = decisions.gender.next;
  }
  if (decisions.dob.kind === 'write') patch[`${key}dob`] = decisions.dob.next;
  return { patch, decisions };
}

function collect(
  result: ScanResult,
  collection: CollectionName,
  id: string,
  decisions: ReturnType<typeof decideFields>,
): void {
  tally(result.audit.phone, decisions.phone);
  tally(result.audit.gender, decisions.gender);
  tally(result.audit.dob, decisions.dob);
  for (const field of ['phone', 'gender', 'dob'] as const) {
    const decision = decisions[field];
    if (decision.kind === 'quarantine') {
      result.quarantine.push({
        collection,
        id,
        field,
        reason: decision.reason ?? 'unparseable',
      });
    }
  }
}

async function scan(
  db: mongo.Db,
  collection: CollectionName,
  write: boolean,
): Promise<ScanResult> {
  const result: ScanResult = {
    audit: newAudit(),
    quarantine: [],
    malformed: 0,
    scanned: 0,
    written: 0,
  };
  const col = db.collection(collection);
  const projection: Record<string, 1> =
    collection === 'users'
      ? { phone: 1, gender: 1, dob: 1 }
      : { userData: 1 };
  const cursor = col.find({}, { projection }).batchSize(500);
  if (limit > 0) cursor.limit(limit);

  for await (const doc of cursor) {
    result.scanned += 1;
    if (collection === 'users') {
      const { patch, decisions } = buildPatch(
        doc as unknown as Record<string, any>,
        '',
        defaultRegion,
      );
      collect(result, collection, String(doc._id), decisions);
      if (write && Object.keys(patch).length > 0) {
        await col.updateOne({ _id: doc._id }, { $set: patch });
        result.written += 1;
      }
      continue;
    }

    const userData = doc.userData;
    if (!userData || typeof userData !== 'object' || Array.isArray(userData)) {
      result.malformed += 1;
      continue;
    }
    const { patch, decisions } = buildPatch(
      userData as Record<string, any>,
      'userData',
      defaultRegion,
    );
    collect(result, collection, String(doc._id), decisions);
    if (write && Object.keys(patch).length > 0) {
      await col.updateOne({ _id: doc._id }, { $set: patch });
      result.written += 1;
    }
  }
  return result;
}

function assertAudit(name: CollectionName, audit: Audit): void {
  assertNoLoss(`${name}.phone`, audit.phone);
  assertNoLoss(`${name}.gender`, audit.gender);
  assertNoLoss(`${name}.dob`, audit.dob);
}

function table(name: string, audit: Audit): string {
  const row = (field: string, c: FieldCounts): string =>
    `| ${field} | ${c.total} | ${c.keep} | ${c.write} | ${c.quarantine} | ${c.blank} |`;
  return [
    `### ${name}`,
    '',
    '| campo | total | keep | write | quarantine | blank |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    row('phone', audit.phone),
    row('gender', audit.gender),
    row('dob', audit.dob),
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db as mongo.Db;

  const collections: CollectionName[] =
    source === 'both' ? ['users', 'appointments'] : [source as CollectionName];

  const before: Partial<Record<CollectionName, ScanResult>> = {};
  for (const collection of collections) {
    before[collection] = await scan(db, collection, apply);
    assertAudit(collection, before[collection].audit);
  }

  const after: Partial<Record<CollectionName, ScanResult>> = {};
  if (apply) {
    for (const collection of collections) {
      after[collection] = await scan(db, collection, false);
      assertAudit(collection, after[collection].audit);
    }
  }

  const quarantine = collections.flatMap(
    (collection) => before[collection]?.quarantine ?? [],
  );
  const report = {
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    defaultRegion,
    source,
    limit: limit || null,
    before: Object.fromEntries(
      collections.map((collection) => [
        collection,
        {
          ...before[collection]!.audit,
          scanned: before[collection]!.scanned,
          written: before[collection]!.written,
          malformed: before[collection]!.malformed,
        },
      ]),
    ),
    after: apply
      ? Object.fromEntries(
          collections.map((collection) => [
            collection,
            after[collection]!.audit,
          ]),
        )
      : null,
    quarantine: {
      total: quarantine.length,
      shown: Math.min(quarantine.length, 1000),
      hits: quarantine.slice(0, 1000),
    },
  };

  const text = asJson
    ? JSON.stringify(report, null, 2)
    : [
        `# Normalización users/appointments v1 (${report.mode})`,
        '',
        `Generado: ${report.generatedAt}`,
        `Región por defecto: ${report.defaultRegion}`,
        `Colecciones: ${source}`,
        '',
        ...collections.map((collection) =>
          table(collection, before[collection]!.audit),
        ),
        `## Cuarentena (${quarantine.length})`,
        '',
        quarantine.length === 0
          ? 'Sin registros en cuarentena.'
          : [
              '| colección | _id | campo | motivo |',
              '| --- | --- | --- | --- |',
              ...quarantine
                .slice(0, 1000)
                .map(
                  (hit) =>
                    `| ${hit.collection} | ${hit.id} | ${hit.field} | ${hit.reason} |`,
                ),
              '',
              quarantine.length > 1000
                ? `_Mostrando 1000 de ${quarantine.length}. Usa --json para el listado completo._`
                : '',
            ].join('\n'),
        '',
      ].join('\n');

  if (out) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(out, text, 'utf8');
    console.log(`Auditoría escrita en ${out}`);
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
