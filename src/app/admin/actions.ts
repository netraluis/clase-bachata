"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const ROLES: Role[] = ["admin", "profe", "alumno"];

export async function setRole(id: string, role: Role): Promise<{ error?: string }> {
  const user = await getSessionUser();
  if (!user?.isAdmin) return { error: "Solo el admin puede cambiar roles" };
  if (!ROLES.includes(role)) return { error: "Rol inválido" };
  if (id === user.id) return { error: "No puedes cambiar tu propio rol" };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return {};
}

export async function renameSchool(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user?.isAdmin) return;
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  if (!name) return;
  const supabase = await createClient();
  const { data: school } = await supabase.from("schools").select("id").order("created_at").limit(1).single();
  if (!school) return;
  await supabase.from("schools").update({ name }).eq("id", school.id);
  revalidatePath("/", "layout");
}
