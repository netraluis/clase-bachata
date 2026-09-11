import Link from "next/link";
import { notFound } from "next/navigation";
import { getVideo, formatDate } from "@/lib/videos";
import { Player } from "./player";

export const dynamic = "force-dynamic";

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const v = await getVideo(id);
  if (!v) notFound();

  // aspect-ratio desde la BD: los verticales no se deforman
  const ratio = v.width && v.height ? `${v.width} / ${v.height}` : "16 / 9";
  const vertical = !!(v.width && v.height && v.height > v.width);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 sm:p-6">
      <Link href="/" className="text-sm underline">← Todos los vídeos</Link>

      <Player src={v.videoUrl} ratio={ratio} vertical={vertical} />

      <h1 className="text-xl font-semibold">{v.title}</h1>
      <p className="text-sm capitalize text-zinc-600">{formatDate(v.class_date)}</p>
      {v.notes && (
        <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-3 dark:bg-amber-950">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-300">
            Nota del profe
          </p>
          <p className="whitespace-pre-line text-sm text-amber-950 dark:text-amber-50">{v.notes}</p>
        </div>
      )}
    </main>
  );
}
