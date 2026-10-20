import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const KEY_ENV = 'MEDICAL_RECORDS_ENC_KEY';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;
const TAG_BYTES = 16;

// base64 lengths: 12-byte IV = 16 chars, 16-byte GCM tag = 22 chars + "==".
const IV_B64 = '[A-Za-z0-9+/]{16}';
const TAG_B64 = '[A-Za-z0-9+/]{22}==';
const CIPHERTEXT_B64 =
  '(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?';

export const ENCRYPTED_FIELD_PATTERN = new RegExp(
  `^${IV_B64}:${TAG_B64}:${CIPHERTEXT_B64}$`,
);

function getKey(): Buffer {
  const raw = process.env[KEY_ENV];
  if (!raw) throw new Error(`${KEY_ENV} is not set`);
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(`${KEY_ENV} must decode to exactly ${KEY_BYTES} bytes`);
  }
  return key;
}

export function encryptField(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString('base64'))
    .join(':');
}

export function isEncryptedField(value: unknown): value is string {
  return typeof value === 'string' && ENCRYPTED_FIELD_PATTERN.test(value);
}

export function decryptField(value: string): string {
  if (value === '') return '';
  if (!isEncryptedField(value)) {
    throw new Error('Invalid encrypted field payload');
  }
  const [iv, tag, ciphertext] = value.split(':');
  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(iv, 'base64'),
  );
  const authTag = Buffer.from(tag, 'base64');
  if (authTag.length !== TAG_BYTES) {
    throw new Error('Invalid encrypted field authentication tag');
  }
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
