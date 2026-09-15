import { redirect } from "next/navigation";
import { SetHeaderCrumbs } from "@/components/header-title";
import { getSessionUser } from "@/lib/auth";
import { listCourses, getSession, sessionTitle } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Uploader } from "./uploader";

// Solo admin y profes (rol en la tabla profiles).
// Con ?session=<id> se sube a esa clase concreta (curso, fecha y título ya fijados).
export default async function SubirPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const [user, { session: sessionId }] = await Promise.all([getSessionUser(), searchParams]);
  if (!user) redirect("/login");
  if (!user.canUpload) redirect("/events?error=no-profe");

  const [courses, session] = await Promise.all([
    listCourses(),
    sessionId && /^[0-9a-f-]{36}$/.test(sessionId) ? getSession(sessionId) : Promise.resolve(null),
  ]);
  const today = new Date().getDay();
  const detected = courses.find((c) => c.slots.some((s) => s.weekday === today)) ?? null;
  const locked = session ? { id: session.id, courseId: session.course.id, courseName: session.course.name, date: session.date, title: session.title, label: sessionTitle(session) } : null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <SetHeaderCrumbs crumbs={[{ label: "Subir" }]} />
      {courses.length === 0 ? (
        <Alert>
          <AlertDescription>No hay cursos. El admin tiene que crear uno en Personas.</AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardContent>
            <Uploader courses={courses.map((c) => ({ id: c.id, name: c.name, weekdays: c.slots.map((s) => s.weekday) }))} detectedId={detected?.id ?? null} session={locked} />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
