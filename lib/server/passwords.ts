import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LEN = 32;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

function derive(password: string, salt: string) {
  return scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = derive(password, salt).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

const DUMMY_SALT = randomBytes(16).toString("hex");
const DUMMY_HASH = derive("not-a-real-password", DUMMY_SALT);

export function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  const valid = parts.length === 3 && parts[0] === "scrypt" && parts[1].length > 0 && parts[2].length === KEY_LEN * 2;
  const salt = valid ? parts[1] : DUMMY_SALT;
  const expected = valid ? Buffer.from(parts[2], "hex") : DUMMY_HASH;
  const actual = derive(password, salt);
  const matches = expected.length === actual.length && timingSafeEqual(actual, expected);
  return valid && matches;
}
