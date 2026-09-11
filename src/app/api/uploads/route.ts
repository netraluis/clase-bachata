import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import { presignPut } from "@/lib/r2";

// Devuelve URLs firmadas para subir el vídeo y su miniatura directo a R2.
// El fichero nunca pasa por Vercel (límite de 4,5 MB de body).
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No has iniciado sesión" }, { status: 401 });
  if (!user.profe) return NextResponse.json({ error: "Solo los profes pueden subir" }, { status: 403 });

  let body: { contentType?: string } = {};
  try {
    body = await request.json();
  } catch {
    // body vacío: se valida abajo
  }

  if (body.contentType !== "video/mp4") {
    return NextResponse.json(
      {
        error:
          "Solo se aceptan vídeos MP4. En iPhone: Ajustes → Cámara → Formatos → \"Más compatible\".",
      },
      { status: 415 },
    );
  }

  const id = randomUUID();
  const videoKey = `videos/${id}.mp4`;
  const thumbKey = `thumbs/${id}.jpg`;

  const [videoUrl, thumbUrl] = await Promise.all([
    presignPut(videoKey, "video/mp4"),
    presignPut(thumbKey, "image/jpeg"),
  ]);

  return NextResponse.json({ id, videoKey, videoUrl, thumbKey, thumbUrl, expiresIn: 600 });
}
