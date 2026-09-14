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

export function formatSchedule(c: { weekday: number | null; start_time: string | null }): string | null {
  if (c.weekday == null) return null;
  const day = WEEKDAYS[c.weekday];
  const cap = day.charAt(0).toUpperCase() + day.slice(1);
  return c.start_time ? `${cap} ${c.start_time.slice(0, 5)}` : cap;
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
