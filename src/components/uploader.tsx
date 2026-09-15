"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readVideoMeta, captureThumbnail, putWithProgress } from "@/lib/video-meta";
import { probeMp4, isHevc, isH264, type Mp4Info } from "@/lib/mp4-probe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Phase = "idle" | "preparando" | "subiendo" | "guardando" | "hecho";
// Clase a la que se sube (desde "Editar clase").
export type LockedSession = { id: string; courseId: string; courseName: string; date: string; title: string | null; label: string };

// Subida de un vídeo a una clase. No es un <form>: se despliega dentro del
// formulario de "Editar clase", así que sus campos no llevan `name` y el
// botón no es de tipo submit.
export function Uploader({ session, onDone }: { session: LockedSession; onDone: () => void }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [probe, setProbe] = useState<Mp4Info | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function onPick(f: File | null) {
    setError(null);
    setWarning(null);
    setFile(null);
    setProbe(null);
    if (!f) return;

    if (f.type !== "video/mp4") {
      setError(
        `Este fichero es "${f.type || f.name.split(".").pop()}" y solo se aceptan MP4. ` +
          `En iPhone: Ajustes → Cámara → Formatos → "Más compatible", y vuelve a grabar. ` +
          `Así se ve en todos los móviles, no solo en el tuyo.`,
      );
      return;
    }
    let info: Mp4Info | null = null;
    try {
      info = await probeMp4(f);
    } catch {
      info = null;
    }
    if (info && isHevc(info.videoCodec)) {
      setError(
        "Este MP4 está grabado en HEVC (H.265). Se ve en tu móvil, pero en Android y en el ordenador media clase verá un reproductor en negro. " +
          'En iPhone: Ajustes → Cámara → Formatos → "Más compatible", y vuelve a grabar.',
      );
      return;
    }
    if (info && info.videoCodec && !isH264(info.videoCodec)) {
      setError(`Este vídeo usa el códec "${info.videoCodec}", que no todos los móviles reproducen. Solo se aceptan vídeos H.264.`);
      return;
    }
    setProbe(info);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.mp4$/i, ""));
  }

  async function submit() {
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      setPhase("preparando");
      let duration = probe?.duration ?? NaN;
      let width = probe?.width ?? 0;
      let height = probe?.height ?? 0;
      let thumb: Blob | null = null;
      try {
        const meta = await readVideoMeta(file);
        if (!Number.isFinite(duration)) duration = meta.duration;
        if (!width || !height) {
          width = meta.width;
          height = meta.height;
        }
        thumb = await captureThumbnail(meta.video);
        URL.revokeObjectURL(meta.video.src);
      } catch {
        if (!Number.isFinite(duration) || !width || !height) {
          throw new Error("El navegador no puede leer este vídeo y tampoco he podido leer sus metadatos. Prueba desde otro navegador o desde el móvil.");
        }
        setWarning("Tu navegador no tiene el códec H.264, así que no se ha podido generar la miniatura. El vídeo es correcto y se sube igual.");
      }

      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType: file.type }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "No se pudo preparar la subida");
      const { videoKey, videoUrl, thumbKey, thumbUrl } = await res.json();

      setPhase("subiendo");
      await putWithProgress(videoUrl, file, "video/mp4", setProgress);
      if (thumb) await putWithProgress(thumbUrl, thumb, "image/jpeg", () => {});

      setPhase("guardando");
      const save = await fetch("/api/videos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          r2_key: videoKey,
          thumb_key: thumb ? thumbKey : null,
          title: title.trim() || file.name,
          course_id: session.courseId,
          date: session.date,
          session_title: session.title,
          notes: notes.trim() || null,
          duration_s: Math.round(duration),
          width,
          height,
          size_bytes: file.size,
        }),
      });
      if (!save.ok) throw new Error((await save.json()).error ?? "No se pudo guardar el vídeo");

      setPhase("hecho");
      router.refresh();
      onDone();
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Algo ha fallado");
    }
  }

  const busy = phase !== "idle" && phase !== "hecho";
  const id = `up-${session.id}`;

  return (
    <div
      className="flex flex-col gap-5"
      // Enter en un campo de la subida no debe guardar la clase.
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") e.preventDefault();
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${id}-file`}>Vídeo (MP4)</FieldLabel>
          <Input id={`${id}-file`} type="file" accept="video/mp4" disabled={busy} onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
          {file && probe && (
            <FieldDescription>
              {isH264(probe.videoCodec) ? "H.264" : (probe.videoCodec ?? "códec desconocido")}
              {probe.width && probe.height ? ` · ${probe.width}×${probe.height}` : ""}
              {probe.duration != null ? ` · ${Math.round(probe.duration)} s` : ""}
              {` · ${(file.size / 1024 / 1024).toFixed(1)} MB`}
            </FieldDescription>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-title`}>Título del vídeo</FieldLabel>
          <Input id={`${id}-title`} value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} placeholder="Vuelta con peinada" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-notes`}>Nota general (opcional)</FieldLabel>
          <Textarea id={`${id}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={busy} rows={2} placeholder="Las notas por momento se añaden después, viendo el vídeo" />
        </Field>
      </FieldGroup>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {warning && (
        <Alert>
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      )}

      {busy && (
        <div className="grid gap-2 text-sm">
          <span>
            {phase === "preparando" && "Leyendo el vídeo…"}
            {phase === "subiendo" && `Subiendo… ${Math.round(progress * 100)}%`}
            {phase === "guardando" && "Guardando…"}
          </span>
          <Progress value={phase === "subiendo" ? progress * 100 : phase === "preparando" ? 0 : 100} />
          <span className="text-xs text-muted-foreground">No cierres el diálogo hasta que termine.</span>
        </div>
      )}

      <Button type="button" onClick={submit} disabled={!file || busy} className="w-fit">
        {busy && <Spinner data-icon="inline-start" />}
        {busy ? "Subiendo…" : "Subir"}
      </Button>
    </div>
  );
}
