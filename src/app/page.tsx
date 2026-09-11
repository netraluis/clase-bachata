import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listVideos, formatDate, formatDuration } from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { error } = await searchParams;
  const videos = await listVideos();

  // Agrupar por fecha de clase (ya vienen ordenados desc)
  const byDate = new Map<string, typeof videos>();
  for (const v of videos) byDate.set(v.class_date, [...(byDate.get(v.class_date) ?? []), v]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Clase de bachata</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-600">
            {user.name ?? user.email} <strong>· {user.role}</strong>
          </span>
          {user.isAdmin && (
            <Link href="/admin" className="underline">
              Personas
            </Link>
          )}
          {user.canUpload && (
            <Link href="/subir" className="rounded-lg bg-black px-3 py-2 text-white dark:bg-white dark:text-black">
              Subir vídeo
            </Link>
          )}
          <form action="/auth/signout" method="post">
            <button className="underline">Salir</button>
          </form>
        </div>
      </header>

      {error === "no-profe" && (
        <p className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900">
          Solo los profes pueden subir vídeos.
        </p>
      )}

      {videos.length === 0 && (
        <p className="text-zinc-600">Todavía no hay vídeos. El jueves que viene habrá.</p>
      )}

      {[...byDate.entries()].map(([date, items]) => (
        <section key={date} className="flex flex-col gap-3">
          <h2 className="text-lg font-medium capitalize">{formatDate(date)}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((v) => (
              <li key={v.id}>
                <Link href={`/v/${v.id}`} className="flex flex-col gap-1">
                  <div
                    className="relative w-full overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800"
                    style={{ aspectRatio: "16 / 9" }}
                  >
                    {v.thumbUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumbUrl} alt="" className="h-full w-full object-cover" />
                    )}
                    {v.duration_s != null && (
                      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-xs text-white">
                        {formatDuration(v.duration_s)}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium">{v.title}</span>
                  {v.notes && <span className="line-clamp-2 text-xs text-zinc-600">{v.notes}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
