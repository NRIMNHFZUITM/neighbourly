/**
 * Time helpers pinned to Malaysia time (UTC+8, no daylight saving), so slot maths and
 * labels are identical in the browser, the API and CI, whatever the machine's timezone.
 */

export const TIME_ZONE = "Asia/Kuala_Lumpur";
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type DateInput = Date | string | number;

const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d));

/** Calendar date ("YYYY-MM-DD") of an instant, in Malaysia time. */
export function mytDateKey(date: DateInput): string {
  return new Date(toDate(date).getTime() + MYT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Minutes since midnight of an instant, in Malaysia time. */
export function mytMinutesOfDay(date: DateInput): number {
  const shifted = new Date(toDate(date).getTime() + MYT_OFFSET_MS);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

/** The instant for a Malaysia-time calendar date plus minutes since midnight. */
export function fromMyt(dateKey: string, minutes = 0): Date {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d, 0, minutes) - MYT_OFFSET_MS);
}

export function addDaysToKey(dateKey: string, days: number): string {
  return mytDateKey(fromMyt(dateKey, 12 * 60).getTime() + days * DAY_MS);
}

/** "07:30" -> 450 */
export function parseHHMM(value: string): number {
  const [h, m] = value.split(":").map(Number) as [number, number];
  return h * 60 + (m || 0);
}

/** 450 -> "07:30" */
export function formatHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-MY", { timeZone: TIME_ZONE, ...options });
    fmtCache.set(key, f);
  }
  return f;
}

/** "6:00 pm" */
export function formatTime(date: DateInput): string {
  return fmt({ hour: "numeric", minute: "2-digit", hour12: true })
    .format(toDate(date))
    .replace(/\s?([ap])\.?m\.?/i, (_, ap: string) => ` ${ap.toLowerCase()}m`);
}

/** Minutes since midnight -> "6:00 pm" */
export function formatMinutes(minutes: number): string {
  return formatTime(fromMyt("2026-01-01", minutes));
}

/** "Tue, 20 Oct" */
export function formatDay(date: DateInput): string {
  return fmt({ weekday: "short", day: "numeric", month: "short" }).format(toDate(date));
}

/** "20 Oct 2026" */
export function formatLongDate(date: DateInput): string {
  return fmt({ day: "numeric", month: "short", year: "numeric" }).format(toDate(date));
}

/** "Today", "Tomorrow", "Yesterday" or "Tue, 20 Oct" */
export function formatDayRelative(date: DateInput, now: DateInput = new Date()): string {
  const key = mytDateKey(date);
  const today = mytDateKey(now);
  if (key === today) return "Today";
  if (key === addDaysToKey(today, 1)) return "Tomorrow";
  if (key === addDaysToKey(today, -1)) return "Yesterday";
  return formatDay(date);
}

/** "Today, 6:00 pm – 8:00 pm" */
export function formatWindow(start: DateInput, end: DateInput, now: DateInput = new Date()): string {
  return `${formatDayRelative(start, now)}, ${formatTime(start)} – ${formatTime(end)}`;
}

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", "20 Oct 2026" */
export function formatRelative(date: DateInput, now: DateInput = new Date()): string {
  const diff = toDate(now).getTime() - toDate(date).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatLongDate(date);
}

/** Monday-based week key for charts, e.g. "12 Oct". */
export function weekLabel(date: DateInput): string {
  return fmt({ day: "numeric", month: "short" }).format(startOfWeek(date));
}

export function startOfWeek(date: DateInput): Date {
  const key = mytDateKey(date);
  const d = fromMyt(key, 12 * 60);
  const weekday = (new Date(d.getTime() + MYT_OFFSET_MS).getUTCDay() + 6) % 7; // Monday = 0
  return fromMyt(addDaysToKey(key, -weekday), 0);
}

export function hoursBetween(a: DateInput, b: DateInput): number {
  return (toDate(b).getTime() - toDate(a).getTime()) / 3_600_000;
}
