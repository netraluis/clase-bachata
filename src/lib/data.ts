import { createClient } from "@/lib/supabase/server";
import { presignGet } from "@/lib/r2";
import type { Role } from "@/lib/auth";
import { formatDate } from "@/lib/format";

// Jerarquía: escuela → curso → sesión → vídeo → comentario.

export type School = { id: string; name: string };
export type Course = {
  id: string;
  school_id: string;
  name: string;
  weekday: number | null; // 0 domingo … 6 sábado
  start_time: string | null; // "20:00:00"
};
export type Session = { id: string; course_id: string; date: string; title: string | null; notes: string | null };
export type VideoRow = {
  id: string;
  session_id: string;
  r2_key: string;
  thumb_key: string | null;
  title: string;
  notes: string | null;
  duration_s: number | null;
  width: number | null;
  height: number | null;
  status: "pending" | "processing" | "ready" | "failed";
  created_at: string;
};
export type Comment = {
  id: string;
  video_id: string;
  author_id: string;
  author_name: string;
  author_role: Role;
  t_seconds: number;
  body: string;
  created_at: string;
};

const VIDEO_COLS = "id, session_id, r2_key, thumb_key, title, notes, duration_s, width, height, status, created_at";

export async function getSchool(): Promise<School | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("schools").select("id, name").order("created_at").limit(1).maybeSingle();
  return data as School | null;
}

export async function listCourses(): Promise<(Course & { sessions: number; videos: number })[]> {
  const supabase = await createClient();
  const [{ data: courses }, { data: sessions }, { data: videos }] = await Promise.all([
    supabase.from("courses").select("id, school_id, name, weekday, start_time").order("created_at"),
    supabase.from("sessions").select("id, course_id"),
    supabase.from("videos").select("id, session_id"),
  ]);
  const sessionCourse = new Map((sessions ?? []).map((s) => [s.id, s.course_id]));
  const sessionsByCourse = new Map<string, number>();
  const videosByCourse = new Map<string, number>();
  for (const s of sessions ?? []) sessionsByCourse.set(s.course_id, (sessionsByCourse.get(s.course_id) ?? 0) + 1);
  for (const v of videos ?? []) {
    const c = sessionCourse.get(v.session_id);
    if (c) videosByCourse.set(c, (videosByCourse.get(c) ?? 0) + 1);
  }
  return ((courses ?? []) as Course[]).map((c) => ({
    ...c,
    sessions: sessionsByCourse.get(c.id) ?? 0,
    videos: videosByCourse.get(c.id) ?? 0,
  }));
}

export async function getCourse(id: string): Promise<Course | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("id, school_id, name, weekday, start_time").eq("id", id).maybeSingle();
  return data as Course | null;
}

// Sesiones de un curso con sus vídeos (miniaturas firmadas), más recientes primero.
export async function listSessionsWithVideos(
  courseId: string,
): Promise<(Session & { videos: (VideoRow & { thumbUrl: string | null })[] })[]> {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, course_id, date, title, notes")
    .eq("course_id", courseId)
    .order("date", { ascending: false });
  const list = (sessions ?? []) as Session[];
  if (list.length === 0) return [];

  const { data: videos } = await supabase
    .from("videos")
    .select(VIDEO_COLS)
    .in("session_id", list.map((s) => s.id))
    .order("created_at", { ascending: true });

  const withThumbs = await Promise.all(
    ((videos ?? []) as VideoRow[]).map(async (v) => ({
      ...v,
      thumbUrl: v.thumb_key ? await presignGet(v.thumb_key) : null,
    })),
  );
  return list.map((s) => ({ ...s, videos: withThumbs.filter((v) => v.session_id === s.id) }));
}

// Todas las clases de la escuela, de más reciente a menos, con su curso y sus vídeos.
export async function listAllSessions(): Promise<
  (Session & { course: Course; videos: (VideoRow & { thumbUrl: string | null })[] })[]
> {
  const supabase = await createClient();
  const [{ data: sessions }, { data: courses }] = await Promise.all([
    supabase.from("sessions").select("id, course_id, date, title, notes").order("date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("courses").select("id, school_id, name, weekday, start_time"),
  ]);
  const list = (sessions ?? []) as Session[];
  const courseById = new Map(((courses ?? []) as Course[]).map((c) => [c.id, c]));
  if (list.length === 0) return [];

  const { data: videos } = await supabase
    .from("videos")
    .select(VIDEO_COLS)
    .in("session_id", list.map((s) => s.id))
    .order("created_at", { ascending: true });
  const withThumbs = await Promise.all(
    ((videos ?? []) as VideoRow[]).map(async (v) => ({
      ...v,
      thumbUrl: v.thumb_key ? await presignGet(v.thumb_key) : null,
    })),
  );
  return list
    .filter((s) => courseById.has(s.course_id))
    .map((s) => ({ ...s, course: courseById.get(s.course_id)!, videos: withThumbs.filter((v) => v.session_id === s.id) }));
}

export function sessionTitle(s: { title: string | null; date: string }): string {
  return s.title?.trim() || `Clase del ${formatDate(s.date).replace(/^\w+, /, "")}`;
}

export async function getVideo(
  id: string,
): Promise<(VideoRow & { videoUrl: string; posterUrl: string | null; session: Session; course: Course; comments: Comment[] }) | null> {
  const supabase = await createClient();
  const { data: v } = await supabase.from("videos").select(VIDEO_COLS).eq("id", id).maybeSingle();
  if (!v) return null;
  const video = v as VideoRow;

  const { data: session } = await supabase
    .from("sessions")
    .select("id, course_id, date, title, notes")
    .eq("id", video.session_id)
    .single();
  const { data: course } = await supabase
    .from("courses")
    .select("id, school_id, name, weekday, start_time")
    .eq("id", (session as Session).course_id)
    .single();
  const { data: comments } = await supabase
    .from("comments")
    .select("id, video_id, author_id, author_name, author_role, t_seconds, body, created_at")
    .eq("video_id", id)
    .order("t_seconds", { ascending: true });

  return {
    ...video,
    videoUrl: await presignGet(video.r2_key),
    posterUrl: video.thumb_key ? await presignGet(video.thumb_key) : null,
    session: session as Session,
    course: course as Course,
    comments: ((comments ?? []) as Comment[]).map((c) => ({ ...c, t_seconds: Number(c.t_seconds) })),
  };
}

// Busca la sesión de un curso en una fecha; la crea si no existe.
// Requiere rol profe o admin (política RLS de sessions).
export async function findOrCreateSession(courseId: string, date: string, title?: string | null): Promise<Session> {
  const supabase = await createClient();
  const { data: found } = await supabase
    .from("sessions")
    .select("id, course_id, date, title, notes")
    .eq("course_id", courseId)
    .eq("date", date)
    .maybeSingle();
  if (found) {
    const f = found as Session;
    if (title && !f.title) {
      await supabase.from("sessions").update({ title }).eq("id", f.id);
      f.title = title;
    }
    return f;
  }

  const { data: created, error } = await supabase
    .from("sessions")
    .insert({ course_id: courseId, date, title: title || null })
    .select("id, course_id, date, title, notes")
    .single();
  if (created) return created as Session;

  // Carrera: otro la creó a la vez. Volver a buscar.
  const { data: again } = await supabase
    .from("sessions")
    .select("id, course_id, date, title, notes")
    .eq("course_id", courseId)
    .eq("date", date)
    .maybeSingle();
  if (again) return again as Session;
  throw new Error(error?.message ?? "No se pudo crear la sesión");
}

export { WEEKDAYS, formatDate, formatSchedule, formatDuration, formatStamp } from "@/lib/format";
