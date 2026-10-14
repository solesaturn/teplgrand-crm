export const SEED_ADMIN = {
  id: "admin",
  name: "Администратор",
  login: "admin",
  passwordHash: "4085689a6d4abbe0a0e5bc0c71f3cf398a4e6590ef7036740c443d5849fe4bf9",
};

export const SEED_SELLER_LOGINS: Record<string, { login: string; passwordHash: string }> = {
  "s-marina": {
    login: "marina",
    passwordHash: "4d7e9c6504a0b4139cb553bd7f7249d4ff85b97c59cc5ebf448b0c8ba49c528c",
  },
  "s-artem": {
    login: "artem",
    passwordHash: "c1b184ee5e238f14f053c57a8184c314e048d08df3eab131b84e003a75a7e8c4",
  },
  "s-kira": {
    login: "kira",
    passwordHash: "bd5ce126fd8434bf29867afe7174a3c095a4685ddece52c0597838c606a008cd",
  },
};

export function normalizeLogin(value: string) {
  return value.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
