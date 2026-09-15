import { notFound } from "next/navigation";
import { getVideo, listCourseNames, listSessionsOfCourse } from "@/lib/data";
import { formatShortDate } from "@/lib/format";
import { SetHeaderCrumbs } from "@/components/header-title";
import { getSessionUser } from "@/lib/auth";
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

  return (
    <main className="flex flex-1 flex-col">
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
      <Player
        videoId={v.id}
        src={v.videoUrl}
        poster={v.posterUrl}
        filmstrip={v.filmstripUrl}
        ratio={ratio}
        duration={v.duration_s ?? 0}
        comments={v.comments}
        profeNote={v.notes}
        viewer={user ? { id: user.id, role: user.role, isAdmin: user.isAdmin, canWrite: user.canUpload } : null}
        // Sin cabecera propia: las migas ya dicen curso, clase y fecha. La papelera va con las herramientas.
        toolsExtra={
          user?.isAdmin ? (
            <DeleteButton
              title={`Borrar el vídeo «${v.title}»`}
              description="Se borra el vídeo de R2 con sus notas. Esta acción no se puede deshacer."
              action={deleteVideo.bind(null, v.id)}
              redirectTo={`/lessons/${v.course.id}`}
            />
          ) : null
        }
      />
    </main>
  );
}
