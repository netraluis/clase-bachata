import Link from "next/link";
import { listAllSessions, sessionTitle } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { EditSession } from "@/components/edit-session";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { VideoList } from "@/components/video-list";

export const dynamic = "force-dynamic";

// Ruta por defecto: todas las clases, de más reciente a menos.
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [sessions, user] = await Promise.all([listAllSessions(), getSessionUser()]);

  const videoIds = sessions.flatMap((s) => s.videos.map((v) => v.id));
  const counts = new Map<string, number>();
  if (videoIds.length) {
    const supabase = await createClient();
    const { data } = await supabase.from("comments").select("video_id").in("video_id", videoIds);
    for (const c of data ?? []) counts.set(c.video_id, (counts.get(c.video_id) ?? 0) + 1);
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      {error === "no-profe" && (
        <Alert>
          <AlertDescription>Solo los profes pueden subir vídeos.</AlertDescription>
        </Alert>
      )}

      <h1 className="text-2xl font-bold">Clases</h1>

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
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" render={<Link href={`/lessons/${s.course.id}`} />}>
                {s.course.name}
              </Badge>
              {s.title && <CardDescription>{formatDate(s.date)}</CardDescription>}
            </div>
            <CardTitle>{sessionTitle(s)}</CardTitle>
            {s.notes && <CardDescription>{s.notes}</CardDescription>}
            {user?.canUpload && (
              <CardAction>
                <EditSession session={s} />
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
