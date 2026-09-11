import { redirect } from "next/navigation";
import { getSessionUser, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSchool, listCourses } from "@/lib/data";
import { formatSchedule, WEEKDAYS } from "@/lib/format";
import { initials } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RoleSelect } from "./role-select";
import { WeekdaySelect } from "./weekday-select";
import { createCourse, renameSchool } from "./actions";

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

  const today = new Date();
  const missing = courses.filter((c) => {
    if (c.weekday == null) return false;
    const d = new Date(today);
    d.setDate(today.getDate() - ((today.getDay() - c.weekday + 7) % 7));
    const iso = isoDate(d);
    return !(recentSessions ?? []).some((s) => s.course_id === c.id && s.date === iso);
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">

      <Card>
        <CardHeader>
          <CardTitle>Escuela</CardTitle>
          <CardDescription>Acceso desde navegador</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={renameSchool} className="flex flex-wrap items-end gap-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="school">Nombre</Label>
              <Input id="school" name="name" defaultValue={school?.name ?? ""} />
            </div>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead className="text-right">Clases</TableHead>
                <TableHead className="text-right">Vídeos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{formatSchedule(c) ?? "Sin horario"}</TableCell>
                  <TableCell className="text-right">{c.sessions}</TableCell>
                  <TableCell className="text-right">{c.videos}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="border-t">
          <form action={createCourse} className="flex w-full flex-wrap items-end gap-2">
            <div className="grid min-w-40 flex-1 gap-2">
              <Label htmlFor="course-name">Nuevo curso</Label>
              <Input id="course-name" name="name" required placeholder="Salsa intermedio" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="weekday">Día</Label>
              <WeekdaySelect days={WEEKDAYS} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="start_time">Hora</Label>
              <Input id="start_time" name="start_time" type="time" />
            </div>
            <Button type="submit">Crear</Button>
          </form>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personas</CardTitle>
          <CardDescription>Quien entra con Google aparece aquí como alumno. Cambia el rol a profe para que pueda subir vídeos y dejar notas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Actividad</TableHead>
                <TableHead className="text-right">Rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((p) => {
                const n = videosBy.get(p.id) ?? 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">{initials(p.display_name ?? p.email)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{p.display_name ?? p.email}</p>
                          <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.role === "alumno" ? `Desde el ${shortDate(p.created_at)}` : `${n} ${n === 1 ? "vídeo" : "vídeos"}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.id === user.id && <Badge variant="secondary">tú</Badge>}
                        <RoleSelect id={p.id} role={p.role} disabled={p.id === user.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-heading text-2xl font-bold ${warn ? "text-primary" : ""}`}>{value}</p>
    </div>
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
