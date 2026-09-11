import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourse, listSessionsWithVideos, formatDate, formatDuration, formatSchedule } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const course = await getCourse(id);
  if (!course) notFound();

  const sessions = await listSessionsWithVideos(id);

  // Notas por vídeo, para el badge "N notas"
  const videoIds = sessions.flatMap((s) => s.videos.map((v) => v.id));
  const counts = new Map<string, number>();
  if (videoIds.length) {
    const supabase = await createClient();
    const { data } = await supabase.from("comments").select("video_id").in("video_id", videoIds);
    for (const c of data ?? []) counts.set(c.video_id, (counts.get(c.video_id) ?? 0) + 1);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <Link href="/" className="text-small text-paper-dim hover:text-paper">← Cursos</Link>

      <div>
        <h1 className="text-display">{course.name}</h1>
        <p className="mt-1 text-small text-paper-dim">{formatSchedule(course) ?? "Sin horario"}</p>
      </div>

      {sessions.length === 0 && (
        <p className="text-paper-dim">Todavía no hay sesiones. Se crean al subir el primer vídeo.</p>
      )}

      {sessions.map((s) => (
        <section key={s.id} className="flex flex-col gap-2">
          <h2 className="text-lede">{formatDate(s.date)}</h2>
          {s.notes && <p className="text-small text-paper-dim">{s.notes}</p>}
          <div className="card px-4 py-1">
            {s.videos.length === 0 && <p className="py-3 text-small text-paper-dim">Sin vídeos</p>}
            {s.videos.map((v) => {
              const n = counts.get(v.id) ?? 0;
              return (
                <Link key={v.id} href={`/v/${v.id}`} className="row">
                  <div className="thumb">
                    {v.thumbUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumbUrl} alt="" />
                    )}
                    {v.duration_s != null && <i>{formatDuration(v.duration_s)}</i>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-small font-semibold">{v.title}</h4>
                    {v.notes && <small className="line-clamp-1 block text-mini text-paper-dim">{v.notes}</small>}
                    {n > 0 && <span className="badge mt-1">{n} {n === 1 ? "nota" : "notas"}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
