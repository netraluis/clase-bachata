"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readVideoMeta, captureThumbnail, putWithProgress, lastThursday } from "@/lib/video-meta";

type Phase = "idle" | "preparando" | "subiendo" | "guardando" | "hecho";

export function Uploader() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [classDate, setClassDate] = useState(lastThursday());
  const [notes, setNotes] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function onPick(f: File | null) {
    setError(null);
    setFile(null);
    if (!f) return;
    if (f.type !== "video/mp4") {
      setError(
        `Este fichero es "${f.type || f.name.split(".").pop()}" y solo se aceptan MP4. ` +
          `En iPhone: Ajustes → Cámara → Formatos → "Más compatible", y vuelve a grabar. ` +
          `Así se ve en todos los móviles, no solo en el tuyo.`,
      );
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.mp4$/i, ""));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setProgress(0);

    try {
      setPhase("preparando");
      const { video, duration, width, height } = await readVideoMeta(file);
      const thumb = await captureThumbnail(video);
      URL.revokeObjectURL(video.src);

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
          class_date: classDate,
          notes: notes.trim() || null,
          duration_s: Math.round(duration),
          width,
          height,
        }),
      });
      if (!save.ok) throw new Error((await save.json()).error ?? "No se pudo guardar el vídeo");

      setPhase("hecho");
      router.push("/");
      router.refresh();
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Algo ha fallado");
    }
  }

  const busy = phase !== "idle" && phase !== "hecho";

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Vídeo (MP4)
        <input
          type="file"
          accept="video/mp4"
          disabled={busy}
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          className="rounded-lg border border-zinc-300 p-2 dark:border-zinc-700"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Título
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          required
          placeholder="Vuelta con peinada"
          className="rounded-lg border border-zinc-300 p-2 dark:border-zinc-700"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Fecha de la clase
        <input
          type="date"
          value={classDate}
          onChange={(e) => setClassDate(e.target.value)}
          disabled={busy}
          required
          className="rounded-lg border border-zinc-300 p-2 dark:border-zinc-700"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Nota para la clase (opcional)
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={busy}
          rows={3}
          placeholder="Ojo al peso en el tercer tiempo"
          className="rounded-lg border border-zinc-300 p-2 dark:border-zinc-700"
        />
      </label>

      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-900">{error}</p>}

      {busy && (
        <div className="flex flex-col gap-1 text-sm">
          <span>
            {phase === "preparando" && "Leyendo el vídeo…"}
            {phase === "subiendo" && `Subiendo… ${Math.round(progress * 100)}%`}
            {phase === "guardando" && "Guardando…"}
          </span>
          <div className="h-2 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full bg-black transition-[width] dark:bg-white"
              style={{ width: `${phase === "subiendo" ? progress * 100 : phase === "preparando" ? 0 : 100}%` }}
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!file || busy}
        className="rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {busy ? "Subiendo…" : "Subir vídeo"}
      </button>
    </form>
  );
}
