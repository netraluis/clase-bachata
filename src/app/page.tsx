import Link from "next/link";
import { listCourses, formatSchedule } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const courses = await listCourses();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      {error === "no-profe" && <p className="notice notice-brass">Solo los profes pueden subir vídeos.</p>}

      <h1 className="text-display">Cursos</h1>

      {courses.length === 0 && (
        <p className="text-paper-dim">Todavía no hay cursos. El admin los crea en Personas.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {courses.map((c) => (
          <Link key={c.id} href={`/c/${c.id}`} className="card flex flex-col gap-1 p-5 no-underline hover:border-paper-dim">
            <h3 className="text-lede">{c.name}</h3>
            <small className="text-small text-paper-dim">{formatSchedule(c) ?? "Sin horario"}</small>
            <small className="mt-2 text-mini text-paper-dim">
              {c.sessions} {c.sessions === 1 ? "sesión" : "sesiones"} · {c.videos} {c.videos === 1 ? "vídeo" : "vídeos"}
            </small>
          </Link>
        ))}
      </div>
    </main>
  );
}
