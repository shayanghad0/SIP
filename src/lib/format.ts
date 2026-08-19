/** Persian display helpers (fa-IR). */

export function faNum(value: number | string, fractionDigits = 0): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("fa-IR", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  });
}

export function faDate(iso: string, withTime = false): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function faShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fa-IR", { month: "short", day: "numeric" });
}

export function pct(value: number, digits = 0): string {
  return `${faNum(value, digits)}٪`;
}

export function scoreOf20(value: number): string {
  return `${faNum(value, 1)} / ${faNum(20)}`;
}

export const PERSIAN_WEEKDAYS = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
] as const;

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function weekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function isWeekday(dateIso: string): boolean {
  // Iranian school week: Saturday (6) .. Thursday (4). Fri=5, Sat=0 weekend.
  const dow = new Date(`${dateIso}T12:00:00`).getDay();
  return dow >= 1 && dow <= 4;
}
