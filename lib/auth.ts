export const SEED_ADMIN = {
  id: "admin",
  name: "Администратор",
  login: "admin",
  passwordHash: "",
};

export function normalizeLogin(value: string) {
  return value.trim().toLowerCase();
}
