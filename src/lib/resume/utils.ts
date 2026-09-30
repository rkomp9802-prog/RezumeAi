// Общие утилиты: id, даты, ссылки, текст. Используются формой, рендерами, экспортом и AI.

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------- даты ----------
// Месяцы храним как "YYYY-MM" (поля начала и окончания), полные даты — как "YYYY-MM-DD" (дата рождения)

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const DAY_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const monthFormat = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" });
const dayFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// Intl добавляет «г.» в конце — в резюме это лишнее
const stripYearSuffix = (s: string) => s.replace(/\s?г\.$/, "");

export function formatMonth(value: string): string {
  if (!MONTH_RE.test(value)) return "";
  const [y, m] = value.split("-").map(Number);
  return stripYearSuffix(monthFormat.format(new Date(Date.UTC(y, m - 1, 1))));
}

export function formatDay(value: string): string {
  if (!DAY_RE.test(value)) return "";
  const [y, m, d] = value.split("-").map(Number);
  return stripYearSuffix(dayFormat.format(new Date(Date.UTC(y, m - 1, d))));
}

/** «март 2021 — настоящее время», «2019 — 2021» и т. п. Пустые края пропускаются. */
export function formatPeriod(start: string, end: string, current = false): string {
  const from = formatMonth(start);
  const to = current ? "настоящее время" : formatMonth(end);
  if (from && to) return `${from} — ${to}`;
  return from || to;
}

/** true, если конец раньше начала (обе даты в формате YYYY-MM). */
export function isPeriodReversed(start: string, end: string): boolean {
  return MONTH_RE.test(start) && MONTH_RE.test(end) && end < start;
}

// ---------- ссылки ----------

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * Приводит пользовательскую ссылку к абсолютному безопасному URL.
 * «github.com/user» → «https://github.com/user». javascript: и прочие схемы отбрасываются.
 */
export function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value.replace(/^\/+/, "")}`;
  try {
    const url = new URL(withProtocol);
    if (!SAFE_PROTOCOLS.has(url.protocol)) return null;
    if ((url.protocol === "http:" || url.protocol === "https:") && !url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}

export const isValidUrl = (raw: string) => raw.trim() === "" || normalizeUrl(raw) !== null;

/** Короткая подпись ссылки для вывода: без протокола, www и завершающего слэша. */
export function displayUrl(href: string): string {
  return href
    .replace(/^(https?:\/\/)?(www\.)?/i, "")
    .replace(/^mailto:|^tel:/i, "")
    .replace(/\/$/, "");
}

export function phoneHref(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.length >= 5 ? `tel:${digits}` : null;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- текст ----------

export const splitLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•—–*]\s*/, "").trim())
    .filter(Boolean);

export const splitTags = (text: string) =>
  Array.from(
    new Set(
      text
        .split(/[,;\n]/)
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );

export const hasText = (value: string | null | undefined) => !!value && value.trim().length > 0;

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export function fileSafeName(value: string, fallback = "resume"): string {
  const cleaned = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return cleaned || fallback;
}
