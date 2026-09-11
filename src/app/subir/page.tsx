import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listCourses } from "@/lib/data";
import { Uploader } from "./uploader";

// Solo admin y profes (rol en la tabla profiles).
export default async function SubirPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.canUpload) redirect("/?error=no-profe");

  const courses = await listCourses();
  // La clase de hoy ya está elegida: el curso cuyo día de la semana es hoy.
  const today = new Date().getDay();
  const detected = courses.find((c) => c.weekday === today) ?? null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <Link href="/" className="text-small text-paper-dim hover:text-paper">← Cursos</Link>
      {courses.length === 0 ? (
        <p className="notice notice-brass">No hay cursos. El admin tiene que crear uno en Personas.</p>
      ) : (
        <div className="card p-5">
          <Uploader
            courses={courses.map((c) => ({ id: c.id, name: c.name, weekday: c.weekday }))}
            detectedId={detected?.id ?? null}
          />
        </div>
      )}
    </main>
  );
}
