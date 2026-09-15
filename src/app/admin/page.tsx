import { redirect } from "next/navigation";
import { SetHeaderCrumbs } from "@/components/header-title";
import { getSessionUser, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSchool, listCourses } from "@/lib/data";
import { formatSchedule, initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Item, ItemGroup, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemSeparator } from "@/components/ui/item";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RoleSelect } from "./role-select";
import { EditCourse } from "@/components/edit-course";
import { DeleteButton } from "@/components/delete-button";
import { deleteCourse } from "@/app/actions/edit";
import { renameSchool } from "./actions";

export const dynamic = "force-dynamic";

type ProfileRow = { id: string; email: string; display_name: string | null; role: Role; created_at: string };

// Administración: alta de gente, cursos, y qué clases se han quedado sin vídeo.
export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/events");

  const supabase = await createClient();
  const [school, courses, { data: profiles }, { data: sizes }, { data: uploads }, { data: recentSessions }] = await Promise.all([
    getSchool(),
    listCourses(),
    supabase.from("profiles").select("id, email, display_name, role, created_at").order("created_at"),
    supabase.from("videos").select("size_bytes"),
    supabase.from("videos").select("uploaded_by"),
    supabase.from("sessions").select("course_id, date").gte("date", isoDaysAgo(7)),
  ]);

  const people = (profiles ?? []) as ProfileRow[];
  const bytes = (sizes ?? []).reduce((acc, v) => acc + (Number(v.size_bytes) || 0), 0);
  const alumnos = people.filter((p) => p.role === "alumno").length;
  const videosBy = new Map<string, number>();
  for (const v of uploads ?? []) if (v.uploaded_by) videosBy.set(v.uploaded_by, (videosBy.get(v.uploaded_by) ?? 0) + 1);

  // Cursos cuya última clase de horario (esta semana) no tiene sesión.
  const today = new Date();
  const missing = courses.filter((c) =>
    c.slots.some((slot) => {
      const d = new Date(today);
      d.setDate(today.getDate() - ((today.getDay() - slot.weekday + 7) % 7));
      const iso = isoDate(d);
      return !(recentSessions ?? []).some((s) => s.course_id === c.id && s.date === iso);
    }),
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <SetHeaderCrumbs crumbs={[{ label: "Personas" }]} />

      <Card>
        <CardHeader>
          <CardTitle>Escuela</CardTitle>
          <CardDescription>Acceso desde navegador</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={renameSchool} className="flex flex-wrap items-end gap-2">
            <Field className="flex-1">
              <FieldLabel htmlFor="school">Nombre</FieldLabel>
              <Input id="school" name="name" defaultValue={school?.name ?? ""} />
            </Field>
            <Button type="submit" variant="outline">Guardar</Button>
          </form>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Almacenamiento en uso" value={formatBytes(bytes)} />
            <Stat label="Alumnos con acceso" value={String(alumnos)} />
            <Stat label="Clases sin vídeo esta semana" value={String(missing.length)} warn={missing.length > 0} />
          </div>
          {missing.length > 0 && (
            <Alert>
              <AlertDescription>Sin vídeo esta semana: {missing.map((c) => c.name).join(", ")}.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cursos</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemGroup>
            {courses.map((c, i) => (
              <div key={c.id}>
                {i > 0 && <ItemSeparator />}
                <Item size="sm">
                  <ItemContent>
                    <ItemTitle>{c.name}</ItemTitle>
                    <ItemDescription>{formatSchedule(c.slots) ?? "Sin horario"}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Badge variant="outline">{c.sessions} {c.sessions === 1 ? "clase" : "clases"}</Badge>
                    <Badge variant="outline">{c.videos} {c.videos === 1 ? "vídeo" : "vídeos"}</Badge>
                    <EditCourse course={c} />
                    {c.sessions === 0 && (
                      <DeleteButton
                        title={`Borrar el curso «${c.name}»`}
                        description="No tiene clases, así que no se pierde ningún vídeo. Esta acción no se puede deshacer."
                        action={deleteCourse.bind(null, c.id)}
                      />
                    )}
                  </ItemActions>
                </Item>
              </div>
            ))}
          </ItemGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personas</CardTitle>
          <CardDescription>Quien entra con Google aparece aquí como alumno. Cambia el rol a profe para que pueda subir vídeos y dejar notas.</CardDescription>
        </CardHeader>
        <CardContent>
          <ItemGroup>
            {people.map((p, i) => {
              const n = videosBy.get(p.id) ?? 0;
              return (
                <div key={p.id}>
                  {i > 0 && <ItemSeparator />}
                  <Item size="sm" className="flex-wrap">
                    <ItemMedia>
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">{initials(p.display_name ?? p.email)}</AvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent className="min-w-0">
                      <ItemTitle className="truncate">{p.display_name ?? p.email}</ItemTitle>
                      <ItemDescription className="truncate">{p.email}</ItemDescription>
                      <ItemDescription>
                        {p.role === "alumno" ? `Desde el ${shortDate(p.created_at)}` : `${n} ${n === 1 ? "vídeo" : "vídeos"}`}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions className="basis-full justify-end sm:basis-auto">
                      {p.id === user.id && <Badge variant="secondary">tú</Badge>}
                      <RoleSelect id={p.id} role={p.role} disabled={p.id === user.id} />
                    </ItemActions>
                  </Item>
                </div>
              );
            })}
          </ItemGroup>
        </CardContent>
      </Card>
    </main>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className={`text-2xl ${warn ? "text-primary" : ""}`}>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${Math.round(n / 1024 ** 2)} MB`;
  return `${Math.round(n / 1024)} KB`;
}
function isoDate(d: Date): string {
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return isoDate(d);
}
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}
