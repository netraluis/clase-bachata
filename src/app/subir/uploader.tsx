"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readVideoMeta, captureThumbnail, putWithProgress, lastWeekday } from "@/lib/video-meta";
import { probeMp4, isHevc, isH264, type Mp4Info } from "@/lib/mp4-probe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type Phase = "idle" | "preparando" | "subiendo" | "guardando" | "hecho";
type CourseOpt = { id: string; name: string; weekday: number | null };

export function Uploader({ courses, detectedId }: { courses: CourseOpt[]; detectedId: string | null }) {
  const router = useRouter();
  const initialId = detectedId ?? courses[0]?.id ?? "";
  const [courseId, setCourseId] = useState<string>(initialId);
  const course = courses.find((c) => c.id === courseId) ?? null;
  const [file, setFile] = useState<File | null>(null);
  const [probe, setProbe] = useState<Mp4Info | null>(null);
  const [title, setTitle] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [classDate, setClassDate] = useState(() => lastWeekday(courses.find((c) => c.id === initialId)?.weekday ?? null));
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !courseId) return;
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
          course_id: courseId,
          date: classDate,
          session_title: sessionTitle.trim() || null,
          notes: notes.trim() || null,
          duration_s: Math.round(duration),
          width,
          height,
          size_bytes: file.size,
        }),
      });
      if (!save.ok) throw new Error((await save.json()).error ?? "No se pudo guardar el vídeo");

      setPhase("hecho");
      router.push("/events");
      router.refresh();
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Algo ha fallado");
    }
  }

  const busy = phase !== "idle" && phase !== "hecho";

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Subir a {course?.name ?? "…"}</h1>
        <p className="text-sm text-muted-foreground">
          {courseId === detectedId ? "Detectado por el horario de hoy" : "Elige el curso y la fecha de la clase"}
        </p>
      </div>

      <FieldGroup>
      {courses.length > 1 && (
        <Field>
          <FieldLabel htmlFor="course">Curso</FieldLabel>
          <Select
            value={courseId}
            disabled={busy}
            onValueChange={(v) => {
              const id = String(v ?? "");
              setCourseId(id);
              const c = courses.find((x) => x.id === id);
              setClassDate(lastWeekday(c?.weekday ?? null));
            }}
          >
            <SelectTrigger id="course" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <Field>
        <FieldLabel htmlFor="file">Vídeo (MP4)</FieldLabel>
        <Input id="file" type="file" accept="video/mp4" disabled={busy} onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
        {file && probe && (
          <FieldDescription>
            {isH264(probe.videoCodec) ? "H.264" : (probe.videoCodec ?? "códec desconocido")}
            {probe.width && probe.height ? ` · ${probe.width}×${probe.height}` : ""}
            {probe.duration != null ? ` · ${Math.round(probe.duration)} s` : ""}
            {` · ${(file.size / 1024 / 1024).toFixed(1)} MB`}
          </FieldDescription>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="date">Fecha de la clase</FieldLabel>
          <Input id="date" type="date" value={classDate} onChange={(e) => setClassDate(e.target.value)} disabled={busy} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="session">Título de la clase (opcional)</FieldLabel>
          <Input id="session" value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} disabled={busy} placeholder="Coreo, segunda parte" />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="title">Título del vídeo</FieldLabel>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} required placeholder="Vuelta con peinada" />
      </Field>

      <Field>
        <FieldLabel htmlFor="notes">Nota general (opcional)</FieldLabel>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={busy} rows={2} placeholder="Las notas por momento se añaden después, viendo el vídeo" />
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
          <span className="text-xs text-muted-foreground">No cierres la pestaña hasta que termine.</span>
        </div>
      )}

      <Button type="submit" disabled={!file || busy} className="w-fit">
        {busy ? "Subiendo…" : "Subir vídeo"}
      </Button>
    </form>
  );
}
