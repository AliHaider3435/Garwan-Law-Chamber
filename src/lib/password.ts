import { randomBytes, scrypt, timingSafeEqual } from 'crypto';

const KEY_LENGTH = 64;
const HASH_PREFIX = 'scrypt';

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `${HASH_PREFIX}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export function isPasswordHash(value: string): boolean {
  return value.startsWith(`${HASH_PREFIX}$`);
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!isPasswordHash(stored)) {
    const supplied = Buffer.from(password);
    const legacy = Buffer.from(stored);
    return supplied.length === legacy.length && timingSafeEqual(supplied, legacy);
  }

  const [, encodedSalt, encodedKey] = stored.split('$');
  if (!encodedSalt || !encodedKey) return false;

  const salt = Buffer.from(encodedSalt, 'base64url');
  const expected = Buffer.from(encodedKey, 'base64url');
  if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false;

  const actual = await deriveKey(password, salt);
  return timingSafeEqual(actual, expected);
}
