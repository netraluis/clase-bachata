// Formateadores puros. Sin dependencias de servidor: se usan también en cliente.

export const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function formatDate(iso: string): string {
  const s = new Date(iso + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// "20:00–21:30", "20:00" o null. Si acaba otro día: "20:00–01:00 (acaba el 11-09-26)";
// en un horario semanal, sin fechas: "23:00–01:00 (+1 día)".
export function formatTimeRange(t: { start_time: string | null; end_time: string | null; date?: string; end_date?: string | null }): string | null {
  if (!t.start_time) return null;
  const start = t.start_time.slice(0, 5);
  if (!t.end_time) return start;
  const end = t.end_time.slice(0, 5);
  if (t.end_date && t.date && t.end_date !== t.date) return `${start}–${end} (acaba el ${formatShortDate(t.end_date)})`;
  if (!t.date && end <= start) return `${start}–${end} (+1 día)`;
  return `${start}–${end}`;
}

// Un horario semanal: "Jueves 20:00–21:30".
export function formatSlot(s: { weekday: number; start_time: string | null; end_time: string | null }): string {
  const day = WEEKDAYS[s.weekday];
  const cap = day.charAt(0).toUpperCase() + day.slice(1);
  const time = formatTimeRange(s);
  return time ? `${cap} ${time}` : cap;
}

// Todos los horarios de un curso, de lunes a domingo: "Martes 20:00 · Jueves 20:00–21:30".
export function formatSchedule(slots: { weekday: number; start_time: string | null; end_time: string | null }[]): string | null {
  if (slots.length === 0) return null;
  return sortSlots(slots).map(formatSlot).join(" · ");
}

// Lunes primero (Date.getDay pone el domingo en 0).
export function sortSlots<T extends { weekday: number; start_time: string | null }>(slots: T[]): T[] {
  return [...slots].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || (a.start_time ?? "").localeCompare(b.start_time ?? ""));
}

export function formatDuration(s: number | null): string {
  if (s == null) return "";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

// Marca de tiempo de nota: 75.4 → "1:15"
export function formatStamp(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t - m * 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Iniciales para el avatar: "Ana Ruiz" → "AR", "ana@x.com" → "A"
export function initials(s: string): string {
  const parts = s.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

// Día corto: 2026-09-10 → "jueves 10 sept"
export function formatDayShort(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" }).replace(",", "");
}

// Fecha corta: 2026-09-10 → "10-09-26"
export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y.slice(2)}`;
}
