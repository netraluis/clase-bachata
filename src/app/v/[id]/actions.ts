"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function addComment(videoId: string, t: number, body: string): Promise<{ error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Entra para dejar una nota" };
  if (!user.canUpload) return { error: "Solo los profes pueden dejar notas" };
  const text = body.trim().slice(0, 2000);
  if (!text) return { error: "La nota está vacía" };
  if (!Number.isFinite(t) || t < 0) return { error: "Tiempo inválido" };

  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({
    video_id: videoId,
    author_id: user.id,
    author_name: user.name ?? user.email.replace(/@.*/, ""),
    author_role: user.role,
    t_seconds: Math.round(t * 10) / 10,
    body: text,
  });
  if (error) return { error: error.message };
  revalidatePath(`/v/${videoId}`);
  return {};
}

export async function deleteComment(videoId: string, commentId: string): Promise<{ error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Sin sesión" };
  const supabase = await createClient();
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) return { error: error.message };
  revalidatePath(`/v/${videoId}`);
  return {};
}
