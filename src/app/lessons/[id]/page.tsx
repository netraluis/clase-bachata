import { notFound } from "next/navigation";
import { getCourse, listSessionsWithVideos, listCourseNames, sessionTitle } from "@/lib/data";
import { SetHeaderCrumbs } from "@/components/header-title";
import { formatDate, formatSchedule, formatTimeRange } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { EditSession, NewSession } from "@/components/edit-session";
import { EditCourse } from "@/components/edit-course";
import { DeleteButton } from "@/components/delete-button";
import { deleteCourse, deleteSession } from "@/app/actions/edit";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { VideoList } from "@/components/video-list";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const course = await getCourse(id);
  if (!course) notFound();

  const [sessions, user, courses] = await Promise.all([listSessionsWithVideos(id), getSessionUser(), listCourseNames()]);
  const videoIds = sessions.flatMap((s) => s.videos.map((v) => v.id));
  const counts = new Map<string, number>();
  if (videoIds.length) {
    const supabase = await createClient();
    const { data } = await supabase.from("comments").select("video_id").in("video_id", videoIds);
    for (const c of data ?? []) counts.set(c.video_id, (counts.get(c.video_id) ?? 0) + 1);
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <SetHeaderCrumbs
        crumbs={[
          {
            label: course.name,
            title: "Cursos",
            options: courses.map((c) => ({ label: c.name, href: `/lessons/${c.id}`, current: c.id === course.id })),
            links: [
              { label: "Todos los cursos", href: "/lessons" },
              { label: "Todas las clases", href: "/events" },
            ],
          },
        ]}
      />

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{course.name}</h1>
          <p className="text-sm text-muted-foreground">{formatSchedule(course.slots) ?? "Sin horario"}</p>
        </div>
        {user?.canUpload && <NewSession courseId={course.id} slots={course.slots} />}
        {user?.isAdmin && <EditCourse course={course} />}
        {user?.isAdmin && sessions.length === 0 && (
          <DeleteButton
            title={`Borrar el curso «${course.name}»`}
            description="No tiene clases, así que no se pierde ningún vídeo. Esta acción no se puede deshacer."
            action={deleteCourse.bind(null, course.id)}
            redirectTo="/lessons"
          />
        )}
      </div>

      {sessions.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Todavía no hay clases</EmptyTitle>
            <EmptyDescription>Se crean al subir el primer vídeo, o con «Nueva clase».</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {sessions.map((s) => (
        <Card key={s.id} id={`s-${s.id}`} className="scroll-mt-20">
          <CardHeader>
            {(s.title || s.start_time) && <CardDescription>{[s.title ? formatDate(s.date) : null, formatTimeRange(s)].filter(Boolean).join(" · ")}</CardDescription>}
            <CardTitle>{sessionTitle(s)}</CardTitle>
            {s.notes && <CardDescription>{s.notes}</CardDescription>}
            {user?.canUpload && (
              <CardAction className="flex items-center">
                <EditSession session={s} slots={course.slots} course={{ id: course.id, name: course.name }} videos={s.videos.map((v) => ({ id: v.id, title: v.title, notes: v.notes }))} canDelete={user.isAdmin} />
                {user.isAdmin && (
                  <DeleteButton
                    title={`Borrar la clase «${sessionTitle(s)}»`}
                    description={
                      s.videos.length === 0
                        ? "La clase no tiene vídeos. Esta acción no se puede deshacer."
                        : `Se borrarán también sus ${s.videos.length} ${s.videos.length === 1 ? "vídeo" : "vídeos"} con sus notas. Esta acción no se puede deshacer.`
                    }
                    action={deleteSession.bind(null, s.id)}
                  />
                )}
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            <VideoList videos={s.videos.map((v) => ({ ...v, noteCount: counts.get(v.id) ?? 0 }))} />
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
