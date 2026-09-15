// Lectura de horas y horarios de los formularios. Puro: se usa desde acciones de servidor.

const TIME = /^\d{2}:\d{2}$/;

export function timeOrNull(v: FormDataEntryValue | null): string | null {
  const t = String(v ?? "").trim();
  return TIME.test(t) ? t : null;
}

export type SlotInput = { weekday: number; start_time: string | null; end_time: string | null };

// Día siguiente en ISO local ("2026-09-10" → "2026-09-11").
export function nextDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

// Una hora de fin igual o anterior a la de inicio significa "acaba al día siguiente".
export function endsNextDay(start: string | null, end: string | null): boolean {
  return !!start && !!end && end.slice(0, 5) <= start.slice(0, 5);
}

// Fecha y horas de una clase leídas del formulario. Si el fin es el mismo día
// y la hora de fin no es posterior, la clase acaba al día siguiente.
export function parseSessionTimes(form: FormData): { error: string } | { date: string; start_time: string | null; end_time: string | null; end_date: string | null } {
  const date = String(form.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Fecha inválida" };
  const start_time = timeOrNull(form.get("start_time"));
  const end_time = timeOrNull(form.get("end_time"));
  const endRaw = String(form.get("end_date") ?? "");
  let end_date: string | null = /^\d{4}-\d{2}-\d{2}$/.test(endRaw) && endRaw !== date ? endRaw : null;
  if (end_time && !start_time) return { error: "Para poner hora de fin hace falta la de inicio" };
  if (end_date && end_date < date) return { error: "La fecha de fin no puede ser anterior a la de inicio" };
  if (!end_date && endsNextDay(start_time, end_time)) end_date = nextDay(date);
  return { date, start_time, end_time, end_date };
}

// Horarios del formulario: campos repetidos slot_weekday / slot_start / slot_end.
// Devuelve un mensaje de error o la lista lista para insertar.
export function parseSlots(form: FormData): { error: string } | { slots: SlotInput[] } {
  const days = form.getAll("slot_weekday").map(String);
  const starts = form.getAll("slot_start");
  const ends = form.getAll("slot_end");
  const slots: SlotInput[] = [];
  for (let i = 0; i < days.length; i++) {
    if (days[i] === "") continue;
    const weekday = Number(days[i]);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return { error: "Día inválido" };
    const start_time = timeOrNull(starts[i] ?? null);
    const end_time = timeOrNull(ends[i] ?? null);
    if (end_time && !start_time) return { error: "Para poner hora de fin hace falta la de inicio" };
    slots.push({ weekday, start_time, end_time });
  }
  return { slots };
}

// Fechas concretas en que cae un horario semanal: de `weeksBack` semanas atrás
// a `weeksAhead` adelante desde hoy, con la hora del horario. Ordenadas.
export type SlotLike = { weekday: number; start_time: string | null; end_time: string | null };
export type Occurrence = { date: string; start_time: string | null; end_time: string | null };

export function slotOccurrences(slots: SlotLike[], weeksBack = 8, weeksAhead = 8, from = new Date()): Occurrence[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const out: Occurrence[] = [];
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate() - weeksBack * 7);
  const days = (weeksBack + weeksAhead) * 7;
  for (let i = 0; i <= days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    for (const s of slots) if (s.weekday === d.getDay()) out.push({ date: iso(d), start_time: s.start_time, end_time: s.end_time });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? "").localeCompare(b.start_time ?? ""));
}
