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

function todayFrom(now: Date) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function todayIso() {
  return todayFrom(new Date());
}

const CALLBACK_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/;

export function splitCallback(value: string | null | undefined) {
  if (!value) return null;
  const match = CALLBACK_RE.exec(value);
  if (!match) return null;
  return { date: match[1], time: match[2] };
}

export function callbackStampOrNull(value: unknown) {
  return typeof value === "string" && splitCallback(value) ? value : null;
}

export function callbackDateTime(value: string | null | undefined) {
  const parts = splitCallback(value);
  if (!parts) return null;
  const [year, month, day] = parts.date.split("-").map(Number);
  const [hour, minute] = parts.time.split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function callbackDue(value: string | null | undefined, now = new Date()) {
  const parts = splitCallback(value);
  if (!parts) return false;
  return parts.date <= todayFrom(now);
}

export function callbackOverdue(value: string | null | undefined, now = new Date()) {
  const moment = callbackDateTime(value);
  if (!moment) return false;
  return moment.getTime() < now.getTime();
}

export function formatCallback(value: string) {
  const moment = callbackDateTime(value);
  const parts = splitCallback(value);
  if (!moment || !parts) return value;
  const day = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(moment);
  return `${day}, ${parts.time}`;
}

export function defaultCallbackParts(existing: string | null | undefined, now = new Date()) {
  const parsed = splitCallback(existing);
  if (parsed) return parsed;
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return { date: todayFrom(next), time: `${String(next.getHours()).padStart(2, "0")}:00` };
}

export function norm(value: string) {
  return value.toLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ").trim();
}

export function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
