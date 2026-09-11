import { NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateSession } from "@/lib/data";
import { r2, bucket } from "@/lib/r2";

type Body = {
  r2_key?: string;
  thumb_key?: string | null;
  title?: string;
  course_id?: string;
  date?: string;
  session_title?: string | null;
  notes?: string | null;
  duration_s?: number;
  width?: number;
  height?: number;
  size_bytes?: number;
};

// Guarda la fila del vídeo una vez que el fichero ya está en R2.
// La sesión (curso + fecha) se busca o se crea aquí.
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No has iniciado sesión" }, { status: 401 });
  if (!user.canUpload) return NextResponse.json({ error: "Solo los profes pueden subir" }, { status: 403 });

  let b: Body = {};
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const uuid = /^[0-9a-f-]{36}$/;
  const keyOk = typeof b.r2_key === "string" && /^videos\/[0-9a-f-]{36}\.mp4$/.test(b.r2_key);
  const thumbOk = b.thumb_key == null || /^thumbs\/[0-9a-f-]{36}\.jpg$/.test(b.thumb_key);
  const dateOk = typeof b.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.date);
  const courseOk = typeof b.course_id === "string" && uuid.test(b.course_id);
  const title = typeof b.title === "string" ? b.title.trim().slice(0, 200) : "";
  if (!keyOk || !thumbOk || !dateOk || !courseOk || !title) {
    return NextResponse.json({ error: "Faltan datos o son inválidos" }, { status: 400 });
  }

  // El fichero tiene que existir de verdad en R2 antes de crear la fila.
  let size: number | null = null;
  try {
    const head = await r2().send(new HeadObjectCommand({ Bucket: bucket(), Key: b.r2_key }));
    size = head.ContentLength ?? null;
  } catch {
    return NextResponse.json({ error: "El vídeo no está en el almacenamiento" }, { status: 409 });
  }

  let session;
  try {
    session = await findOrCreateSession(
      b.course_id!,
      b.date!,
      typeof b.session_title === "string" ? b.session_title.trim().slice(0, 120) : null,
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo crear la sesión" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .insert({
      session_id: session.id,
      r2_key: b.r2_key,
      thumb_key: b.thumb_key ?? null,
      title,
      notes: typeof b.notes === "string" && b.notes.trim() ? b.notes.trim().slice(0, 2000) : null,
      duration_s: Number.isFinite(b.duration_s) ? Math.round(b.duration_s!) : null,
      width: Number.isInteger(b.width) ? b.width : null,
      height: Number.isInteger(b.height) ? b.height : null,
      size_bytes: size ?? (Number.isFinite(b.size_bytes) ? b.size_bytes : null),
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("insert videos:", error.message);
    return NextResponse.json({ error: "No se pudo guardar en la base de datos" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, session_id: session.id }, { status: 201 });
}
