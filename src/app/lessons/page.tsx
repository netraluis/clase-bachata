import Link from "next/link";
import { listCourses } from "@/lib/data";
import { formatSchedule } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

export const dynamic = "force-dynamic";

// Todos los cursos de la escuela.
export default async function LessonsPage() {
  const courses = await listCourses();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold">Cursos</h1>

      {courses.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Todavía no hay cursos</EmptyTitle>
            <EmptyDescription>El admin los crea en Personas.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {courses.map((c) => (
          <Link key={c.id} href={`/lessons/${c.id}`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle>{c.name}</CardTitle>
                <CardDescription>{formatSchedule(c) ?? "Sin horario"}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {c.sessions} {c.sessions === 1 ? "clase" : "clases"} · {c.videos} {c.videos === 1 ? "vídeo" : "vídeos"}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
