import { notFound } from "next/navigation";
import { getCourse, listSessionsWithVideos, sessionTitle } from "@/lib/data";
import { formatDate, formatSchedule } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { VideoList } from "@/components/video-list";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const course = await getCourse(id);
  if (!course) notFound();

  const sessions = await listSessionsWithVideos(id);
  const videoIds = sessions.flatMap((s) => s.videos.map((v) => v.id));
  const counts = new Map<string, number>();
  if (videoIds.length) {
    const supabase = await createClient();
    const { data } = await supabase.from("comments").select("video_id").in("video_id", videoIds);
    for (const c of data ?? []) counts.set(c.video_id, (counts.get(c.video_id) ?? 0) + 1);
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">

      <div>
        <h1 className="text-2xl font-bold">{course.name}</h1>
        <p className="text-sm text-muted-foreground">{formatSchedule(course) ?? "Sin horario"}</p>
      </div>

      {sessions.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Todavía no hay clases</EmptyTitle>
            <EmptyDescription>Se crean al subir el primer vídeo.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {sessions.map((s) => (
        <Card key={s.id}>
          <CardHeader>
            <CardDescription>{formatDate(s.date)}</CardDescription>
            <CardTitle>{sessionTitle(s)}</CardTitle>
            {s.notes && <CardDescription>{s.notes}</CardDescription>}
          </CardHeader>
          <CardContent>
            <VideoList videos={s.videos.map((v) => ({ ...v, noteCount: counts.get(v.id) ?? 0 }))} />
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
