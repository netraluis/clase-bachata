"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

// Cursos: solo admin (la política RLS también lo exige).
export async function updateCourse(id: string, form: FormData): Promise<Result> {
  const user = await getSessionUser();
  if (!user?.isAdmin) return { ok: false, error: "Solo el admin puede editar cursos" };
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  if (!name) return { ok: false, error: "El curso necesita un nombre" };
  const weekdayRaw = String(form.get("weekday") ?? "");
  const weekday = weekdayRaw === "" ? null : Number(weekdayRaw);
  const start = String(form.get("start_time") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({
      name,
      weekday: weekday != null && weekday >= 0 && weekday <= 6 ? weekday : null,
      start_time: /^\d{2}:\d{2}$/.test(start) ? start : null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

// Clases (sesiones): profes y admin.
export async function updateSession(id: string, form: FormData): Promise<Result> {
  const user = await getSessionUser();
  if (!user?.canUpload) return { ok: false, error: "Solo los profes pueden editar clases" };
  const title = String(form.get("title") ?? "").trim().slice(0, 120);
  const date = String(form.get("date") ?? "");
  const notes = String(form.get("notes") ?? "").trim().slice(0, 2000);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Fecha inválida" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ title: title || null, date, notes: notes || null })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ya hay otra clase de este curso en esa fecha" };
    return { ok: false, error: error.message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
