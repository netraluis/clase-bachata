"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readVideoMeta, captureThumbnail, putWithProgress, lastThursday } from "@/lib/video-meta";
import { probeMp4, isHevc, isH264, type Mp4Info } from "@/lib/mp4-probe";

type Phase = "idle" | "preparando" | "subiendo" | "guardando" | "hecho";

export function Uploader() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [probe, setProbe] = useState<Mp4Info | null>(null);
  const [title, setTitle] = useState("");
  const [classDate, setClassDate] = useState(lastThursday());
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

    // Códec y dimensiones leídos del contenedor, sin decodificar nada.
    let info: Mp4Info | null = null;
    try {
      info = await probeMp4(f);
    } catch {
      info = null;
    }
    if (info && isHevc(info.videoCodec)) {
      setError(
        "Este MP4 está grabado en HEVC (H.265). Se ve en tu móvil, pero en Android y en el " +
          "ordenador media clase verá un reproductor en negro. En iPhone: Ajustes → Cámara → " +
          'Formatos → "Más compatible", y vuelve a grabar.',
      );
      return;
    }
    if (info && info.videoCodec && !isH264(info.videoCodec)) {
      setError(
        `Este vídeo usa el códec "${info.videoCodec}", que no todos los móviles reproducen. ` +
          "Solo se aceptan vídeos H.264. Revisa el ajuste de la cámara.",
      );
      return;
    }

    setProbe(info);
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
      // Preferir los metadatos del contenedor: no dependen de que el navegador
      // tenga el códec. El <video> solo hace falta para la miniatura.
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
          throw new Error(
            "El navegador no puede leer este vídeo y tampoco he podido leer sus metadatos. " +
              "Prueba desde otro navegador o desde el móvil.",
          );
        }
        setWarning(
          "Tu navegador no tiene el códec H.264, así que no se ha podido generar la miniatura. " +
            "El vídeo es correcto y se sube igual.",
        );
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
  const inputClass = "field";

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-4">
      <label className="flex flex-col gap-1 text-small text-paper-dim">
        Vídeo (MP4)
        <input
          type="file"
          accept="video/mp4"
          disabled={busy}
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          className={inputClass}
        />
      </label>

      {file && probe && (
        <p className="text-mini text-paper-dim">
          {isH264(probe.videoCodec) ? "H.264" : probe.videoCodec ?? "códec desconocido"}
          {probe.width && probe.height ? ` · ${probe.width}×${probe.height}` : ""}
          {probe.duration != null ? ` · ${Math.round(probe.duration)} s` : ""}
          {` · ${(file.size / 1024 / 1024).toFixed(1)} MB`}
        </p>
      )}

      <label className="flex flex-col gap-1 text-small text-paper-dim">
        Título
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          required
          placeholder="Vuelta con peinada"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-small text-paper-dim">
        Fecha de la clase
        <input
          type="date"
          value={classDate}
          onChange={(e) => setClassDate(e.target.value)}
          disabled={busy}
          required
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-small text-paper-dim">
        Nota para la clase (opcional)
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={busy}
          rows={3}
          placeholder="Ojo al peso en el tercer tiempo"
          className={inputClass}
        />
      </label>

      {error && <p className="notice notice-rosa">{error}</p>}
      {warning && <p className="notice notice-brass">{warning}</p>}

      {busy && (
        <div className="flex flex-col gap-2 text-small">
          <span>
            {phase === "preparando" && "Leyendo el vídeo…"}
            {phase === "subiendo" && `Subiendo… ${Math.round(progress * 100)}%`}
            {phase === "guardando" && "Guardando…"}
          </span>
          <div className="prog">
            <i
              style={{
                width: `${phase === "subiendo" ? progress * 100 : phase === "preparando" ? 0 : 100}%`,
              }}
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!file || busy}
        className="btn btn-primary"
      >
        {busy ? "Subiendo…" : "Subir vídeo"}
      </button>
    </form>
  );
}
