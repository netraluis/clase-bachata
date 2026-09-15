import Link from "next/link";
import { listCourses } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { NewCourse } from "@/components/edit-course";
import { formatSchedule } from "@/lib/format";
import { SetHeaderCrumbs } from "@/components/header-title";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

export const dynamic = "force-dynamic";

// Todos los cursos de la escuela.
export default async function LessonsPage() {
  const [courses, user] = await Promise.all([listCourses(), getSessionUser()]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <SetHeaderCrumbs
        crumbs={[
          {
            label: "Todos los cursos",
            title: "Cursos",
            options: courses.map((c) => ({ label: c.name, href: `/lessons/${c.id}`, current: false })),
            links: [
              { label: "Todos los cursos", href: "/lessons", current: true },
              { label: "Todas las clases", href: "/events" },
            ],
          },
        ]}
      />
      <div className="flex items-start gap-2">
        <h1 className="min-w-0 flex-1 text-2xl font-bold">Cursos</h1>
        {user?.isAdmin && <NewCourse />}
      </div>

      {courses.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Todavía no hay cursos</EmptyTitle>
            <EmptyDescription>El admin los crea con «Nuevo curso».</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {courses.map((c) => (
          <Link key={c.id} href={`/lessons/${c.id}`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle>{c.name}</CardTitle>
                <CardDescription>{formatSchedule(c.slots) ?? "Sin horario"}</CardDescription>
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
