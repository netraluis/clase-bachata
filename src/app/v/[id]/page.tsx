import Link from "next/link";
import { notFound } from "next/navigation";
import { getVideo, formatDate } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { Player } from "./player";

export const dynamic = "force-dynamic";

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [v, user] = await Promise.all([getVideo(id), getSessionUser()]);
  if (!v) notFound();

  const ratio = v.width && v.height ? `${v.width} / ${v.height}` : "16 / 9";
  const vertical = !!(v.width && v.height && v.height > v.width);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <Link href={`/c/${v.course.id}`} className="text-small text-paper-dim hover:text-paper">
        ← {v.course.name}
      </Link>

      <div>
        <h1 className="text-display">{v.title}</h1>
        <p className="mt-1 text-small text-paper-dim">{formatDate(v.session.date)}</p>
      </div>

      <Player
        videoId={v.id}
        src={v.videoUrl}
        ratio={ratio}
        vertical={vertical}
        duration={v.duration_s ?? 0}
        comments={v.comments}
        profeNote={v.notes}
        viewer={user ? { id: user.id, role: user.role, isAdmin: user.isAdmin } : null}
      />
    </main>
  );
}
