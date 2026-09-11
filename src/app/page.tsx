import Link from "next/link";
import { listVideos, formatDate, formatDuration } from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const videos = await listVideos();

  // Agrupar por fecha de clase: la alumna busca un día, no un archivo.
  const byDate = new Map<string, typeof videos>();
  for (const v of videos) byDate.set(v.class_date, [...(byDate.get(v.class_date) ?? []), v]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6">
      {error === "no-profe" && (
        <p className="notice notice-brass">Solo los profes pueden subir vídeos.</p>
      )}

      {videos.length === 0 && (
        <p className="text-paper-dim">Todavía no hay vídeos. El jueves que viene habrá.</p>
      )}

      {[...byDate.entries()].map(([date, items]) => (
        <section key={date} className="flex flex-col gap-2">
          <h2 className="text-lede">{formatDate(date)}</h2>
          <div className="card px-4 py-1">
            {items.map((v) => (
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
                  {v.notes ? (
                    <small className="line-clamp-1 block text-mini text-paper-dim">{v.notes}</small>
                  ) : (
                    <small className="block text-mini text-paper-dim">Sin nota</small>
                  )}
                  {v.notes && <span className="badge mt-1">Nota del profe</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
