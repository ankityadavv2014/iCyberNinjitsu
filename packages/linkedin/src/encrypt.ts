import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN = 16;
const TAG_LEN = 16;
const SALT_LEN = 32;

function getKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LEN);
}

export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  owner_urn?: string;
}

export function encryptTokens(plain: TokenSet, encryptionKey: string): string {
  const salt = randomBytes(SALT_LEN);
  const key = getKey(encryptionKey, salt);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const json = JSON.stringify(plain);
  const enc = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = (cipher as unknown as { getAuthTag: () => Buffer }).getAuthTag();
  return Buffer.concat([salt, iv, tag, enc]).toString('base64');
}

export function decryptTokens(encrypted: string, encryptionKey: string): TokenSet {
  const buf = Buffer.from(encrypted, 'base64');
  const salt = buf.subarray(0, SALT_LEN);
  const iv = buf.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const tag = buf.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + TAG_LEN);
  const enc = buf.subarray(SALT_LEN + IV_LEN + TAG_LEN);
  const key = getKey(encryptionKey, salt);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const json = decipher.update(enc) + decipher.final('utf8');
  return JSON.parse(json) as TokenSet;
}
