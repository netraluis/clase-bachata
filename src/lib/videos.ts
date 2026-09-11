import { createClient } from "@/lib/supabase/server";
import { presignGet } from "@/lib/r2";

export type VideoRow = {
  id: string;
  r2_key: string;
  thumb_key: string | null;
  title: string;
  class_date: string;
  notes: string | null;
  duration_s: number | null;
  width: number | null;
  height: number | null;
  status: "pending" | "processing" | "ready" | "failed";
  created_at: string;
};

export async function listVideos(): Promise<(VideoRow & { thumbUrl: string | null })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .select("id, r2_key, thumb_key, title, class_date, notes, duration_s, width, height, status, created_at")
    .order("class_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return Promise.all(
    (data as VideoRow[]).map(async (v) => ({
      ...v,
      thumbUrl: v.thumb_key ? await presignGet(v.thumb_key) : null,
    })),
  );
}

export async function getVideo(id: string): Promise<(VideoRow & { videoUrl: string }) | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("videos")
    .select("id, r2_key, thumb_key, title, class_date, notes, duration_s, width, height, status, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return { ...(data as VideoRow), videoUrl: await presignGet(data.r2_key) };
}

export function formatDate(iso: string): string {
  const s = new Date(iso + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDuration(s: number | null): string {
  if (s == null) return "";
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
