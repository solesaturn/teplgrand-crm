export const SEED_ADMIN = {
  id: "admin",
  name: "Администратор",
  login: "admin",
  passwordHash: "4085689a6d4abbe0a0e5bc0c71f3cf398a4e6590ef7036740c443d5849fe4bf9",
};

export function normalizeLogin(value: string) {
  return value.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
