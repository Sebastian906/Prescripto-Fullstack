import { createHash } from 'node:crypto';

export interface Args {
  get: (name: string) => string | undefined;
  has: (name: string) => boolean;
  num: (name: string, fallback: number) => number;
}

export function parseArgs(argv: string[] = process.argv.slice(2)): Args {
  const args = argv.filter((arg) => arg !== '--');
  const get = (name: string): string | undefined => {
    const inline = args.find((arg) => arg.startsWith(`${name}=`));
    if (inline) return inline.slice(name.length + 1);
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const has = (name: string): boolean => args.includes(name);
  const num = (name: string, fallback: number): number => {
    const parsed = Number(get(name));
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return { get, has, num };
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Réplica de shared/database/database.module.ts: el .env guarda la URI SIN
 * nombre de base y el nombre se concatena aquí. `--db` permite aislar el seed.
 */
export function mongoUri(
  dbName: string = process.env.MONGODB_DB ?? 'prescripto',
): string {
  const base = process.env.MONGODB_URI;
  if (!base) throw new Error('Falta MONGODB_URI en el entorno');
  // La URI del .env acaba en "/?appName=..." para Atlas: concatenar al final
  // mete el nombre de base dentro del query string y el driver cae en "test".
  const [head, ...query] = base.split('?');
  const root = head.replace(/\/+$/, '');
  const withDb = root.endsWith(`/${dbName}`) ? root : `${root}/${dbName}`;
  return query.length ? `${withDb}?${query.join('?')}` : withDb;
}
