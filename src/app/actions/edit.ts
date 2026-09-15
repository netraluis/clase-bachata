"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseSlots, parseSessionTimes } from "@/lib/schedule";
import { deleteObjects } from "@/lib/r2";

type Result = { ok: true } | { ok: false; error: string };

// Cursos: solo admin (la política RLS también lo exige). Los horarios se
// reemplazan enteros: se borran los del curso y se insertan los del formulario.
export async function updateCourse(id: string, form: FormData): Promise<Result> {
  const user = await getSessionUser();
  if (!user?.isAdmin) return { ok: false, error: "Solo el admin puede editar cursos" };
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  if (!name) return { ok: false, error: "El curso necesita un nombre" };
  const parsed = parseSlots(form);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("courses").update({ name }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  const { error: delError } = await supabase.from("course_slots").delete().eq("course_id", id);
  if (delError) return { ok: false, error: delError.message };
  if (parsed.slots.length > 0) {
    const { error: insError } = await supabase.from("course_slots").insert(parsed.slots.map((s) => ({ ...s, course_id: id })));
    if (insError) return { ok: false, error: insError.message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// Nuevo curso (solo admin) con sus horarios.
export async function createCourse(form: FormData): Promise<Result> {
  const user = await getSessionUser();
  if (!user?.isAdmin) return { ok: false, error: "Solo el admin puede crear cursos" };
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  if (!name) return { ok: false, error: "El curso necesita un nombre" };
  const parsed = parseSlots(form);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const supabase = await createClient();
  const { data: school } = await supabase.from("schools").select("id").order("created_at").limit(1).maybeSingle();
  if (!school) return { ok: false, error: "No hay escuela" };
  const { data: course, error } = await supabase.from("courses").insert({ school_id: school.id, name }).select("id").single();
  if (error || !course) return { ok: false, error: error?.message ?? "No se pudo crear el curso" };
  if (parsed.slots.length > 0) {
    const { error: slotError } = await supabase.from("course_slots").insert(parsed.slots.map((s) => ({ ...s, course_id: course.id })));
    if (slotError) return { ok: false, error: slotError.message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// Clase suelta: una sesión en fecha fija con su hora, creada antes de subir vídeos.
export async function createSession(courseId: string, form: FormData): Promise<Result> {
  const user = await getSessionUser();
  if (!user?.canUpload) return { ok: false, error: "Solo los profes pueden crear clases" };
  const title = String(form.get("title") ?? "").trim().slice(0, 120);
  const notes = String(form.get("notes") ?? "").trim().slice(0, 2000);
  const times = parseSessionTimes(form);
  if ("error" in times) return { ok: false, error: times.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .insert({ course_id: courseId, title: title || null, notes: notes || null, ...times });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ya hay una clase de este curso en esa fecha" };
    return { ok: false, error: error.message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// Clases (sesiones): profes y admin.
export async function updateSession(id: string, form: FormData): Promise<Result> {
  const user = await getSessionUser();
  if (!user?.canUpload) return { ok: false, error: "Solo los profes pueden editar clases" };
  const title = String(form.get("title") ?? "").trim().slice(0, 120);
  const notes = String(form.get("notes") ?? "").trim().slice(0, 2000);
  const times = parseSessionTimes(form);
  if ("error" in times) return { ok: false, error: times.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ title: title || null, notes: notes || null, ...times })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ya hay otra clase de este curso en esa fecha" };
    return { ok: false, error: error.message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// Borrados: solo admin. Los vídeos se quitan primero de R2 y después de la BBDD.
const VIDEO_KEYS = "id, r2_key, thumb_key, filmstrip_key";
type VideoKeys = { id: string; r2_key: string; thumb_key: string | null; filmstrip_key: string | null };

async function removeVideos(videos: VideoKeys[]): Promise<string | null> {
  if (videos.length === 0) return null;
  const supabase = await createClient();
  await deleteObjects(videos.flatMap((v) => [v.r2_key, v.thumb_key, v.filmstrip_key]));
  const { error } = await supabase.from("videos").delete().in("id", videos.map((v) => v.id));
  return error?.message ?? null;
}

export async function deleteVideo(id: string): Promise<Result> {
  const user = await getSessionUser();
  if (!user?.isAdmin) return { ok: false, error: "Solo el admin puede borrar vídeos" };
  const supabase = await createClient();
  const { data: v } = await supabase.from("videos").select(VIDEO_KEYS).eq("id", id).maybeSingle();
  if (!v) return { ok: false, error: "El vídeo ya no existe" };
  const err = await removeVideos([v as VideoKeys]);
  if (err) return { ok: false, error: err };
  revalidatePath("/", "layout");
  return { ok: true };
}

// Borra la clase con todos sus vídeos.
export async function deleteSession(id: string): Promise<Result> {
  const user = await getSessionUser();
  if (!user?.isAdmin) return { ok: false, error: "Solo el admin puede borrar clases" };
  const supabase = await createClient();
  const { data: videos } = await supabase.from("videos").select(VIDEO_KEYS).eq("session_id", id);
  const err = await removeVideos((videos ?? []) as VideoKeys[]);
  if (err) return { ok: false, error: err };
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

// Un curso solo se borra sin clases (la clave foránea también lo impide).
export async function deleteCourse(id: string): Promise<Result> {
  const user = await getSessionUser();
  if (!user?.isAdmin) return { ok: false, error: "Solo el admin puede borrar cursos" };
  const supabase = await createClient();
  const { count } = await supabase.from("sessions").select("id", { count: "exact", head: true }).eq("course_id", id);
  if (count) return { ok: false, error: `El curso tiene ${count} ${count === 1 ? "clase" : "clases"}; bórralas antes` };
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
