import { createClient } from "@/lib/supabase/server";
import { presignGet } from "@/lib/r2";
import type { Role } from "@/lib/auth";
import { formatDate } from "@/lib/format";

// Jerarquía: escuela → curso → sesión → vídeo → comentario.

export type School = { id: string; name: string };
export type Course = { id: string; school_id: string; name: string };
// Horario semanal de un curso; un curso tiene 0..n.
export type Slot = {
  id: string;
  course_id: string;
  weekday: number; // 0 domingo … 6 sábado
  start_time: string | null; // "20:00:00"
  end_time: string | null;
};
export type Session = {
  id: string;
  course_id: string;
  date: string;
  title: string | null;
  notes: string | null;
  start_time: string | null; // fijado en las clases sueltas
  end_time: string | null;
  end_date: string | null; // nula = acaba el mismo día
};
export type VideoRow = {
  id: string;
  session_id: string;
  r2_key: string;
  thumb_key: string | null;
  filmstrip_key: string | null;
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

const VIDEO_COLS = "id, session_id, r2_key, thumb_key, filmstrip_key, title, notes, duration_s, width, height, status, created_at";
const COURSE_COLS = "id, school_id, name";
const SLOT_COLS = "id, course_id, weekday, start_time, end_time";
const SESSION_COLS = "id, course_id, date, title, notes, start_time, end_time, end_date";

export async function getSchool(): Promise<School | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("schools").select("id, name").order("created_at").limit(1).maybeSingle();
  return data as School | null;
}

export async function listCourses(): Promise<(Course & { slots: Slot[]; sessions: number; videos: number })[]> {
  const supabase = await createClient();
  const [{ data: courses }, { data: slots }, { data: sessions }, { data: videos }] = await Promise.all([
    supabase.from("courses").select(COURSE_COLS).order("created_at"),
    supabase.from("course_slots").select(SLOT_COLS),
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
    slots: ((slots ?? []) as Slot[]).filter((s) => s.course_id === c.id),
    sessions: sessionsByCourse.get(c.id) ?? 0,
    videos: videosByCourse.get(c.id) ?? 0,
  }));
}

export async function getCourse(id: string): Promise<(Course & { slots: Slot[] }) | null> {
  const supabase = await createClient();
  const [{ data }, { data: slots }] = await Promise.all([
    supabase.from("courses").select(COURSE_COLS).eq("id", id).maybeSingle(),
    supabase.from("course_slots").select(SLOT_COLS).eq("course_id", id),
  ]);
  return data ? { ...(data as Course), slots: (slots ?? []) as Slot[] } : null;
}

// Sesiones de un curso con sus vídeos (miniaturas firmadas), más recientes primero.
export async function listSessionsWithVideos(
  courseId: string,
): Promise<(Session & { videos: (VideoRow & { thumbUrl: string | null })[] })[]> {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select(SESSION_COLS)
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
  (Session & { course: Course & { slots: Slot[] }; videos: (VideoRow & { thumbUrl: string | null })[] })[]
> {
  const supabase = await createClient();
  const [{ data: sessions }, { data: courses }, { data: slots }] = await Promise.all([
    supabase.from("sessions").select(SESSION_COLS).order("date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("courses").select(COURSE_COLS),
    supabase.from("course_slots").select(SLOT_COLS),
  ]);
  const list = (sessions ?? []) as Session[];
  const courseById = new Map(
    ((courses ?? []) as Course[]).map((c) => [c.id, { ...c, slots: ((slots ?? []) as Slot[]).filter((s) => s.course_id === c.id) }]),
  );
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
): Promise<(VideoRow & { videoUrl: string; posterUrl: string | null; filmstripUrl: string | null; session: Session; course: Course; comments: Comment[] }) | null> {
  const supabase = await createClient();
  // Una sola ida y vuelta: vídeo + sesión + curso embebidos por sus claves foráneas,
  // y los comentarios en paralelo. Las URLs firmadas se calculan en local.
  const [{ data: v }, { data: comments }] = await Promise.all([
    supabase
      .from("videos")
      .select(`${VIDEO_COLS}, sessions!inner(${SESSION_COLS}, courses!inner(${COURSE_COLS}))`)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("comments")
      .select("id, video_id, author_id, author_name, author_role, t_seconds, body, created_at")
      .eq("video_id", id)
      .order("t_seconds", { ascending: true }),
  ]);
  if (!v) return null;

  type Joined = VideoRow & { sessions: Session & { courses: Course } };
  const { sessions: sessionRow, ...video } = v as unknown as Joined;
  const { courses: course, ...session } = sessionRow;
  const [videoUrl, posterUrl, filmstripUrl] = await Promise.all([
    presignGet(video.r2_key),
    video.thumb_key ? presignGet(video.thumb_key) : Promise.resolve(null),
    video.filmstrip_key ? presignGet(video.filmstrip_key) : Promise.resolve(null),
  ]);

  return {
    ...video,
    videoUrl,
    posterUrl,
    filmstripUrl,
    session,
    course,
    comments: ((comments ?? []) as Comment[]).map((c) => ({ ...c, t_seconds: Number(c.t_seconds) })),
  };
}

// Listas ligeras para las migas de la cabecera (sin URLs firmadas).
export async function listCourseNames(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("id, name").order("name");
  return (data ?? []) as { id: string; name: string }[];
}
export async function listSessionsOfCourse(courseId: string): Promise<Session[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("sessions").select(SESSION_COLS).eq("course_id", courseId).order("date", { ascending: false });
  return (data ?? []) as Session[];
}

// Una clase con su curso (para subir vídeos a una clase concreta).
export async function getSession(id: string): Promise<(Session & { course: Course }) | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("sessions").select(`${SESSION_COLS}, courses!inner(${COURSE_COLS})`).eq("id", id).maybeSingle();
  if (!data) return null;
  const { courses: course, ...session } = data as unknown as Session & { courses: Course };
  return { ...session, course };
}

// Busca la sesión de un curso en una fecha; la crea si no existe.
// Requiere rol profe o admin (política RLS de sessions).
export async function findOrCreateSession(courseId: string, date: string, title?: string | null): Promise<Session> {
  const supabase = await createClient();
  const { data: found } = await supabase
    .from("sessions")
    .select(SESSION_COLS)
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
    .select(SESSION_COLS)
    .single();
  if (created) return created as Session;

  // Carrera: otro la creó a la vez. Volver a buscar.
  const { data: again } = await supabase
    .from("sessions")
    .select(SESSION_COLS)
    .eq("course_id", courseId)
    .eq("date", date)
    .maybeSingle();
  if (again) return again as Session;
  throw new Error(error?.message ?? "No se pudo crear la sesión");
}

export { WEEKDAYS, formatDate, formatSchedule, formatDuration, formatStamp } from "@/lib/format";
