import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listCourses } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Uploader } from "./uploader";

// Solo admin y profes (rol en la tabla profiles).
export default async function SubirPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.canUpload) redirect("/events?error=no-profe");

  const courses = await listCourses();
  const today = new Date().getDay();
  const detected = courses.find((c) => c.weekday === today) ?? null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      {courses.length === 0 ? (
        <Alert>
          <AlertDescription>No hay cursos. El admin tiene que crear uno en Personas.</AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardContent>
            <Uploader courses={courses.map((c) => ({ id: c.id, name: c.name, weekday: c.weekday }))} detectedId={detected?.id ?? null} />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
