import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSchool, listCourses, formatSchedule, WEEKDAYS } from "@/lib/data";
import { initials } from "@/components/header";
import { RoleSelect } from "./role-select";
import { createCourse, renameSchool } from "./actions";

export const dynamic = "force-dynamic";

type ProfileRow = { id: string; email: string; display_name: string | null; role: Role; created_at: string };

// Administración: una web, no una app. Quien dirige la escuela entra una vez
// por semana a dar de alta gente, ver qué clases se han quedado sin vídeo y
// controlar cuánto almacenamiento se usa.
export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const supabase = await createClient();
  const [school, courses, { data: profiles }, { data: sizes }, { data: uploads }, { data: recentSessions }] =
    await Promise.all([
      getSchool(),
      listCourses(),
      supabase.from("profiles").select("id, email, display_name, role, created_at").order("created_at"),
      supabase.from("videos").select("size_bytes"),
      supabase.from("videos").select("uploaded_by"),
      supabase.from("sessions").select("course_id, date").gte("date", isoDaysAgo(7)),
    ]);

  const people = (profiles ?? []) as ProfileRow[];
  const bytes = (sizes ?? []).reduce((acc, v) => acc + (Number(v.size_bytes) || 0), 0);
  const alumnos = people.filter((p) => p.role === "alumno").length;
  const videosBy = new Map<string, number>();
  for (const v of uploads ?? []) if (v.uploaded_by) videosBy.set(v.uploaded_by, (videosBy.get(v.uploaded_by) ?? 0) + 1);

  // Clases sin vídeo esta semana: cursos cuyo día ya ha pasado esta semana y no tienen sesión ese día.
  const today = new Date();
  const missing = courses.filter((c) => {
    if (c.weekday == null) return false;
    const d = new Date(today);
    const diff = (today.getDay() - c.weekday + 7) % 7;
    d.setDate(today.getDate() - diff);
    const iso = isoDate(d);
    return !(recentSessions ?? []).some((s) => s.course_id === c.id && s.date === iso);
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <Link href="/" className="text-small text-paper-dim hover:text-paper">← Cursos</Link>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-3 px-5 py-4">
          <form action={renameSchool} className="flex flex-1 items-center gap-2">
            <input name="name" defaultValue={school?.name ?? ""} className="field !min-h-9 !w-auto flex-1 text-lede font-disp" aria-label="Nombre de la escuela" />
            <button className="btn !min-h-9">Guardar</button>
          </form>
          <small className="text-mini text-paper-dim">Acceso desde navegador</small>
        </div>
        <div className="grid grid-cols-3 gap-px bg-ink-3">
          <Stat label="Almacenamiento en uso" value={formatBytes(bytes)} />
          <Stat label="Alumnos con acceso" value={String(alumnos)} />
          <Stat label="Clases sin vídeo esta semana" value={String(missing.length)} warn={missing.length > 0} />
        </div>
        {missing.length > 0 && (
          <p className="px-5 py-3 text-small text-paper-dim">
            Sin vídeo: {missing.map((c) => c.name).join(", ")}.
          </p>
        )}
      </div>

      <section className="card">
        <div className="border-b border-ink-3 px-5 py-4">
          <h2 className="text-lede">Cursos</h2>
        </div>
        <div className="px-5 pb-2">
          {courses.map((c) => (
            <div key={c.id} className="flex items-center gap-3 border-t border-ink-3 py-3 text-small first:border-t-0">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{c.name}</div>
                <div className="text-mini text-paper-dim">{formatSchedule(c) ?? "Sin horario"}</div>
              </div>
              <span className="text-mini text-paper-dim">
                {c.sessions} sesiones, {c.videos} vídeos
              </span>
            </div>
          ))}
        </div>
        <form action={createCourse} className="flex flex-wrap items-end gap-2 border-t border-ink-3 px-5 py-4">
          <label className="flex min-w-40 flex-1 flex-col gap-1 text-mini text-paper-dim">
            Nuevo curso
            <input name="name" required placeholder="Salsa intermedio" className="field !min-h-10" />
          </label>
          <label className="flex flex-col gap-1 text-mini text-paper-dim">
            Día
            <select name="weekday" className="field !min-h-10 !w-auto" defaultValue="">
              <option value="">Sin día</option>
              {WEEKDAYS.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-mini text-paper-dim">
            Hora
            <input name="start_time" type="time" className="field !min-h-10 !w-auto" />
          </label>
          <button className="btn btn-primary !min-h-10">Crear</button>
        </form>
      </section>

      <section className="card">
        <div className="border-b border-ink-3 px-5 py-4">
          <h2 className="text-lede">Personas</h2>
          <p className="mt-1 text-small text-paper-dim">
            Quien entra con Google aparece aquí como alumno. Cambia el rol a profe para que pueda subir vídeos.
          </p>
        </div>
        <div className="px-5 pb-3">
          {people.map((p) => {
            const n = videosBy.get(p.id) ?? 0;
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 border-t border-ink-3 py-3 text-small first:border-t-0">
                <span className={`av ${p.role !== "alumno" ? "av-p" : ""}`}>{initials(p.display_name ?? p.email)}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{p.display_name ?? p.email}</div>
                  <div className="truncate text-mini text-paper-dim">{p.email}</div>
                </div>
                <span className="text-mini text-paper-dim">
                  {p.role === "alumno" ? `Desde el ${shortDate(p.created_at)}` : `${n} ${n === 1 ? "vídeo" : "vídeos"}`}
                </span>
                <RoleSelect id={p.id} role={p.role} disabled={p.id === user.id} />
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="bg-ink-2 px-5 py-4">
      <small className="block text-mini text-paper-dim">{label}</small>
      <b className={`font-disp text-display font-medium ${warn ? "text-brass" : ""}`}>{value}</b>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${Math.round(n / 1024 ** 2)} MB`;
  return `${Math.round(n / 1024)} KB`;
}
function isoDate(d: Date): string {
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return isoDate(d);
}
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}
