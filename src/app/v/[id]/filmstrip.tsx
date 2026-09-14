"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

// Tira de fotogramas con un marco de selección, como el recorte de vídeo de
// Fotos en iPhone: siempre visible bajo el vídeo y de su mismo ancho. De
// entrada el trozo es el vídeo entero; la parte de fuera se atenúa, los
// extremos son dos asas gruesas que se arrastran y el cabezal se ve dentro.
// Los fotogramas se extraen en el navegador con un <video> oculto y un <canvas>.
const FRAMES = 14;
const HANDLE_PX = 28;

export function Filmstrip({
  src,
  duration,
  a,
  b,
  now,
  onChange,
  onSeek,
}: {
  src: string;
  duration: number;
  a: number;
  b: number;
  now: number;
  onChange: (a: number, b: number) => void;
  onSeek: (t: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"a" | "b" | null>(null);
  const [ready, setReady] = useState(false);

  // Extraer FRAMES fotogramas repartidos por el vídeo.
  useEffect(() => {
    if (!duration) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = src;

    const seekTo = (t: number) =>
      new Promise<void>((resolve) => {
        const done = () => {
          video.removeEventListener("seeked", done);
          resolve();
        };
        video.addEventListener("seeked", done);
        video.currentTime = t;
      });

    (async () => {
      await new Promise<void>((resolve) => {
        if (video.readyState >= 1) resolve();
        else video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      });
      if (cancelled) return;
      const vw = video.videoWidth || 16;
      const vh = video.videoHeight || 9;
      const h = 112; // píxeles reales del canvas (se muestra a la mitad)
      const w = Math.round((h * vw) / vh);
      canvas.width = w * FRAMES;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      for (let i = 0; i < FRAMES; i++) {
        if (cancelled) return;
        await seekTo(((i + 0.5) / FRAMES) * duration);
        try {
          ctx.drawImage(video, i * w, 0, w, h);
        } catch {
          // fotograma no disponible: se deja el hueco
        }
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
      video.removeAttribute("src");
      video.load();
    };
  }, [src, duration]);

  const pct = (t: number) => (duration ? Math.max(0, Math.min(100, (t / duration) * 100)) : 0);

  function tFromEvent(e: React.PointerEvent | React.MouseEvent): number {
    const rect = stripRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration;
  }
  // Separación mínima: que quepan las dos asas dentro del marco.
  function minGap(): number {
    const w = stripRef.current?.getBoundingClientRect().width ?? 320;
    return Math.max(0.5, (duration * 2 * HANDLE_PX) / w);
  }
  function onHandleDown(which: "a" | "b", e: React.PointerEvent<HTMLButtonElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = which;
  }
  function onHandleMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return;
    const t = tFromEvent(e);
    const gap = minGap();
    if (dragging.current === "a") {
      const v = Math.max(0, Math.min(t, b - gap));
      onChange(v, b);
      onSeek(v);
    } else {
      const v = Math.min(duration, Math.max(t, a + gap));
      onChange(a, v);
      onSeek(Math.max(a, v - 1));
    }
  }
  function onHandleUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragging.current = null;
    onSeek(a);
  }

  return (
    <div ref={stripRef} className="relative h-14 w-full touch-none overflow-hidden rounded-lg bg-muted select-none" onClick={(e) => onSeek(tFromEvent(e))}>
      <canvas ref={canvasRef} className="block h-full w-full object-cover" aria-hidden="true" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <Spinner className="size-5" />
        </div>
      )}
      {/* fuera del trozo, atenuado */}
      <div className="pointer-events-none absolute inset-y-0 left-0 bg-background/70" style={{ width: `${pct(a)}%` }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 bg-background/70" style={{ width: `${100 - pct(b)}%` }} />
      {/* marco del trozo */}
      <div className="pointer-events-none absolute inset-y-0 rounded-md border-[3px] border-primary" style={{ left: `${pct(a)}%`, width: `${pct(b) - pct(a)}%` }} />
      {/* cabezal */}
      <div className="pointer-events-none absolute inset-y-1 w-0.5 rounded bg-white shadow" style={{ left: `calc(${pct(now)}% - 1px)` }} />
      {/* asas, dentro del marco */}
      <button type="button" className="timeline-trim-handle absolute inset-y-0 flex w-7 cursor-ew-resize items-center justify-center rounded-l-md bg-primary text-primary-foreground"
        aria-label={`Inicio del trozo, ${fmt(a)}`}
        style={{ left: `${pct(a)}%` }}
        onPointerDown={(e) => onHandleDown("a", e)}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onClick={(e) => e.stopPropagation()}
      >
        <ChevronLeft className="size-4" />
      </button>
      <button type="button" className="timeline-trim-handle absolute inset-y-0 flex w-7 -translate-x-full cursor-ew-resize items-center justify-center rounded-r-md bg-primary text-primary-foreground"
        aria-label={`Fin del trozo, ${fmt(b)}`}
        style={{ left: `${pct(b)}%` }}
        onPointerDown={(e) => onHandleDown("b", e)}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onClick={(e) => e.stopPropagation()}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t - m * 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
