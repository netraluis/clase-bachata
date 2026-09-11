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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <Link href="/" className="text-small text-paper-dim hover:text-paper">
        ← Todos los vídeos
      </Link>

      <Player src={v.videoUrl} ratio={ratio} vertical={vertical} />

      <div>
        <h1 className="text-display">{v.title}</h1>
        <p className="mt-1 text-small text-paper-dim">{formatDate(v.class_date)}</p>
      </div>

      {v.notes && (
        <div className="card flex gap-3 p-4">
          <span className="stamp stamp-prof">profe</span>
          <p className="whitespace-pre-line text-small">{v.notes}</p>
        </div>
      )}
    </main>
  );
}
