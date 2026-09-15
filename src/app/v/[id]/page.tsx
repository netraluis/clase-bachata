import Link from "next/link";
import { notFound } from "next/navigation";
import { getVideo, sessionTitle, listCourseNames, listSessionsOfCourse } from "@/lib/data";
import { formatDate, formatShortDate } from "@/lib/format";
import { SetHeaderCrumbs } from "@/components/header-title";
import { getSessionUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/delete-button";
import { deleteVideo } from "@/app/actions/edit";
import { Player } from "./player";

export const dynamic = "force-dynamic";

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [v, user] = await Promise.all([getVideo(id), getSessionUser()]);
  if (!v) notFound();
  const [courses, sessions] = await Promise.all([listCourseNames(), listSessionsOfCourse(v.course.id)]);

  const ratio = v.width && v.height ? `${v.width} / ${v.height}` : "16 / 9";
  const vertical = !!(v.width && v.height && v.height > v.width);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <SetHeaderCrumbs
        crumbs={[
          {
            label: v.course.name,
            href: `/lessons/${v.course.id}`,
            title: "Cursos",
            options: courses.map((c) => ({ label: c.name, href: `/lessons/${c.id}`, current: c.id === v.course.id })),
            links: [
              { label: "Todos los cursos", href: "/lessons" },
              { label: "Todas las clases", href: "/events" },
            ],
          },
          {
            label: v.session.title?.trim() || "Clase",
            href: `/lessons/${v.course.id}#s-${v.session.id}`,
            title: "Clases",
            options: sessions.map((s) => ({
              label: s.title?.trim() || "Clase",
              hint: formatShortDate(s.date),
              href: `/lessons/${v.course.id}#s-${s.id}`,
              current: s.id === v.session.id,
            })),
            links: [{ label: "Clases de este curso", href: `/lessons/${v.course.id}` }],
          },
          { label: formatShortDate(v.session.date) },
        ]}
      />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" render={<Link href={`/lessons/${v.course.id}`} />}>
            {v.course.name}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {v.session.title ? `${sessionTitle(v.session)} · ${formatDate(v.session.date)}` : formatDate(v.session.date)}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <h1 className="min-w-0 flex-1 text-2xl font-bold">{v.title}</h1>
          {user?.isAdmin && (
            <DeleteButton
              title={`Borrar el vídeo «${v.title}»`}
              description="Se borra el vídeo de R2 con sus notas. Esta acción no se puede deshacer."
              action={deleteVideo.bind(null, v.id)}
              redirectTo={`/lessons/${v.course.id}`}
            />
          )}
        </div>
      </div>

      <Player
        videoId={v.id}
        src={v.videoUrl}
        poster={v.posterUrl}
        filmstrip={v.filmstripUrl}
        ratio={ratio}
        vertical={vertical}
        duration={v.duration_s ?? 0}
        comments={v.comments}
        profeNote={v.notes}
        viewer={user ? { id: user.id, role: user.role, isAdmin: user.isAdmin, canWrite: user.canUpload } : null}
      />
    </main>
  );
}
