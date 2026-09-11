"use client";

import { useEffect, useRef, useState } from "react";

const SPEEDS = [0.5, 0.75, 1] as const;

function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

export function Player({ src, ratio, vertical }: { src: string; ratio: string; vertical: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState<number>(1);
  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  // Velocidad: una línea, lo que WhatsApp no hace.
  useEffect(() => {
    if (ref.current) ref.current.playbackRate = speed;
  }, [speed]);

  // Bucle A-B. `timeupdate` solo dispara ~4 veces por segundo, así que
  // se comprueba con requestAnimationFrame para no pasarse del punto B.
  useEffect(() => {
    const video = ref.current;
    if (!video || a == null || b == null || b <= a) return;
    let raf = 0;
    const tick = () => {
      if (video.currentTime >= b || video.currentTime < a - 0.05) video.currentTime = a;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [a, b]);

  const loopOn = a != null && b != null && b > a;

  function markA() {
    const t = ref.current?.currentTime ?? 0;
    setA(t);
    if (b != null && b <= t) setB(null);
  }
  function markB() {
    const t = ref.current?.currentTime ?? 0;
    if (a == null) setA(0);
    setB(t);
    if (a != null && t > a && ref.current) ref.current.currentTime = a;
  }
  function clearLoop() {
    setA(null);
    setB(null);
  }
  function nudge(which: "a" | "b", delta: number) {
    const dur = ref.current?.duration ?? Infinity;
    if (which === "a" && a != null) setA(Math.max(0, Math.min(a + delta, (b ?? dur) - 0.1)));
    if (which === "b" && b != null) setB(Math.max((a ?? 0) + 0.1, Math.min(b + delta, dur)));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Escenario: lo único iluminado de la sala */}
      <div className="overflow-hidden rounded-card bg-stage">
        <div className={vertical ? "mx-auto w-full max-w-sm" : "w-full"}>
          <video
            ref={ref}
            controls
            playsInline
            preload="metadata"
            src={src}
            onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
            className="mx-auto block max-h-[70vh] w-full bg-stage object-contain"
            style={{ aspectRatio: ratio }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-small text-paper-dim">Velocidad</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s)}
            aria-pressed={speed === s}
            className="chip"
          >
            {s === 1 ? "1×" : `${s}×`}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-small text-paper-dim">Bucle</span>
        <button type="button" onClick={markA} aria-pressed={a != null} className="chip">
          {a != null ? `Inicio ${fmt(a)}` : "Marcar inicio"}
        </button>
        <button type="button" onClick={markB} aria-pressed={b != null} className="chip">
          {b != null ? `Fin ${fmt(b)}` : "Marcar fin"}
        </button>
        {(a != null || b != null) && (
          <button type="button" onClick={clearLoop} className="chip">
            Quitar
          </button>
        )}
      </div>

      {loopOn && (
        <div className="flex flex-wrap items-center gap-2 text-small">
          <span className="mr-1 text-paper-dim">Ajustar</span>
          <span className="stamp stamp-prof">inicio</span>
          <button type="button" onClick={() => nudge("a", -0.5)} className="chip">−0,5 s</button>
          <button type="button" onClick={() => nudge("a", 0.5)} className="chip">+0,5 s</button>
          <span className="stamp stamp-prof">fin</span>
          <button type="button" onClick={() => nudge("b", -0.5)} className="chip">−0,5 s</button>
          <button type="button" onClick={() => nudge("b", 0.5)} className="chip">+0,5 s</button>
          <span className="text-mini text-paper-dim">
            {fmt(a)} → {fmt(b)} · ahora {fmt(now)}
          </span>
        </div>
      )}
    </div>
  );
}
