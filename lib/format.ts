export function formatRub(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "нет цены";
  const cents = Math.round(100 * value);
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(cents);
  const rub = Math.floor(abs / 100);
  const frac = abs % 100;
  const grouped = String(rub).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  const body = frac === 0 ? grouped : `${grouped},${String(frac).padStart(2, "0")}`;
  return `${sign}${body}\u00a0₽`;
}

export function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function formatShortDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(new Date(year, month - 1, day));
}

export function formatStamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return formatShortDate(iso);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function norm(value: string) {
  return value.toLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ").trim();
}

export function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
