"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Comment } from "@/lib/data";
import { formatStamp } from "@/lib/format";
import type { Role } from "@/lib/auth";
import { addComment, deleteComment } from "./actions";

const SPEEDS = [0.5, 0.75, 1] as const;
type Viewer = { id: string; role: Role; isAdmin: boolean; canWrite: boolean } | null;
const ROLE_LABEL: Record<Role, string> = { admin: "admin", profe: "profe", alumno: "alumno" };

export function Player({
  videoId,
  src,
  ratio,
  vertical,
  duration: durationProp,
  comments,
  profeNote,
  viewer,
}: {
  videoId: string;
  src: string;
  ratio: string;
  vertical: boolean;
  duration: number;
  comments: Comment[];
  profeNote: string | null;
  viewer: Viewer;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [duration, setDuration] = useState(durationProp);
  const [speed, setSpeed] = useState<number>(1);
  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"a" | "b" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = speed;
  }, [speed]);

  // Bucle A-B con requestAnimationFrame: timeupdate solo dispara ~4 veces/s.
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

  function seek(t: number) {
    const video = ref.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(t, duration || t));
    setNow(video.currentTime);
  }
  function pause() {
    ref.current?.pause();
  }
  function togglePlay() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }
  function onBarClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * duration);
  }
  // Tocar una marca o una nota: pausa y salta a ese momento (Frame.io).
  function pick(c: Comment) {
    pause();
    setSelected(c.id === selected ? null : c.id);
    seek(c.t_seconds);
  }
  // Repetir un trozo: al activarlo, un tramo de 6 s desde el punto actual.
  // Los extremos se arrastran en la barra o se ajustan con ±1 s.
  const MIN_GAP = 0.5;
  function startLoop() {
    const from = Math.max(0, Math.min(now, Math.max(0, duration - MIN_GAP)));
    const to = Math.min(duration || from + 6, from + 6);
    setA(from);
    setB(to);
    seek(from);
    void ref.current?.play();
  }
  function stopLoop() {
    setA(null);
    setB(null);
  }
  function nudge(which: "a" | "b", delta: number) {
    if (a == null || b == null) return;
    if (which === "a") setA(Math.max(0, Math.min(a + delta, b - MIN_GAP)));
    else setB(Math.max(a + MIN_GAP, Math.min(b + delta, duration)));
  }
  function fracFromEvent(e: React.PointerEvent | PointerEvent): number {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }
  function onHandleDown(which: "a" | "b", e: React.PointerEvent<HTMLButtonElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = which;
    pause();
  }
  function onHandleMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging.current || a == null || b == null) return;
    const t = fracFromEvent(e) * duration;
    if (dragging.current === "a") {
      const v = Math.min(t, b - MIN_GAP);
      setA(v);
      seek(v);
    } else {
      const v = Math.max(t, a + MIN_GAP);
      setB(v);
      seek(Math.max(a, v - 1));
    }
  }
  function onHandleUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragging.current = null;
    if (a != null) seek(a);
    void ref.current?.play();
  }

  // Escribir una nota: el vídeo se pausa al enfocar el campo, y el tiempo de
  // la nota es siempre el del cabezal. Si mueves el vídeo, la nota se mueve.
  function onDraftFocus() {
    pause();
  }
  function submitNote(e: React.FormEvent) {
    e.preventDefault();
    const t = ref.current?.currentTime ?? now;
    const body = draft;
    setError(null);
    start(async () => {
      const res = await addComment(videoId, t, body);
      if (res.error) setError(res.error);
      else setDraft("");
    });
  }
  function cancelDraft() {
    setDraft("");
  }
  function remove(c: Comment) {
    start(async () => {
      const res = await deleteComment(videoId, c.id);
      if (res.error) setError(res.error);
    });
  }

  const played = duration ? Math.min(100, (now / duration) * 100) : 0;
  const status = [
    speed !== 1 ? `${speed}×` : null,
    loopOn ? `repitiendo ${formatStamp(a)}–${formatStamp(b)}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const bubbleFor = hovered ?? selected;
  const bubble = bubbleFor ? comments.find((c) => c.id === bubbleFor) ?? null : null;
  const pct = (t: number) => Math.min(100, (t / duration) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Escenario */}
      <div className="stage">
        <div className={vertical ? "mx-auto w-full max-w-sm" : "w-full"}>
          <video
            ref={ref}
            playsInline
            preload="metadata"
            src={src}
            onClick={togglePlay}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || durationProp)}
            className="mx-auto block max-h-[70vh] w-full cursor-pointer bg-stage object-contain"
            style={{ aspectRatio: ratio }}
          />
        </div>
        {!playing && <div className="glyph" aria-hidden="true" />}
        <div className="stage-shade" />

        <div
          ref={barRef}
          className="bar"
          onClick={onBarClick}
          role="slider"
          aria-label="Posición"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={now}
        >
          <div className="played" style={{ width: `${played}%` }} />
          {loopOn && duration > 0 && (
            <>
              <div className="range" style={{ left: `${pct(a)}%`, width: `${pct(b) - pct(a)}%` }} />
              <button
                type="button"
                className="handle"
                style={{ left: `${pct(a)}%` }}
                aria-label={`Inicio del trozo, ${formatStamp(a)}`}
                onPointerDown={(e) => onHandleDown("a", e)}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                className="handle"
                style={{ left: `${pct(b)}%` }}
                aria-label={`Fin del trozo, ${formatStamp(b)}`}
                onPointerDown={(e) => onHandleDown("b", e)}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                onClick={(e) => e.stopPropagation()}
              />
            </>
          )}
          {duration > 0 &&
            comments.map((c) => (
              <button
                key={c.id}
                type="button"
                className="pin pin-prof"
                style={{ left: `${pct(c.t_seconds)}%` }}
                aria-label={`Nota en ${formatStamp(c.t_seconds)}: ${c.body}`}
                aria-pressed={selected === c.id}
                onMouseEnter={() => setHovered(c.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(c.id)}
                onBlur={() => setHovered(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  pick(c);
                }}
              />
            ))}
          {bubble && duration > 0 && (
            <div className="bubble" style={{ left: `clamp(120px, ${pct(bubble.t_seconds)}%, calc(100% - 120px))` }}>
              <p className="who">
                <span className="stamp stamp-prof mr-1">{formatStamp(bubble.t_seconds)}</span>
                {bubble.author_name}
              </p>
              <p className="said line-clamp-4">{bubble.body}</p>
            </div>
          )}
        </div>
        <div className="meta">
          <span>{formatStamp(now)}</span>
          <span className="speed">{status}</span>
          <span>{formatStamp(duration)}</span>
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={togglePlay} className="btn !min-h-9">
          {playing ? "Pausa" : "Reproducir"}
        </button>
        <span className="ml-2 text-small text-paper-dim">Velocidad</span>
        {SPEEDS.map((s) => (
          <button key={s} type="button" onClick={() => setSpeed(s)} aria-pressed={speed === s} className="chip">
            {s === 1 ? "1×" : `${s}×`}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {!loopOn ? (
            <>
              <button type="button" onClick={startLoop} className="chip" disabled={!duration}>
                Repetir un trozo
              </button>
              <span className="text-mini text-paper-dim">
                Repite un paso una y otra vez, desde donde esté el vídeo.
              </span>
            </>
          ) : (
            <>
              <button type="button" onClick={stopLoop} className="chip" aria-pressed="true">
                Repitiendo {formatStamp(a)}–{formatStamp(b)} · parar
              </button>
              <span className="text-mini text-paper-dim">Arrastra los extremos dorados de la barra para ajustar el trozo.</span>
            </>
          )}
        </div>
        {loopOn && (
          <div className="flex flex-wrap items-center gap-2 text-small">
            <span className="text-paper-dim">Inicio</span>
            <button type="button" onClick={() => nudge("a", -1)} className="chip">−1 s</button>
            <button type="button" onClick={() => nudge("a", 1)} className="chip">+1 s</button>
            <span className="ml-2 text-paper-dim">Fin</span>
            <button type="button" onClick={() => nudge("b", -1)} className="chip">−1 s</button>
            <button type="button" onClick={() => nudge("b", 1)} className="chip">+1 s</button>
          </div>
        )}
      </div>

      {/* Notas */}
      <div className="card">
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          <h2 className="text-lede">Notas del profe</h2>
          <span className="text-mini text-paper-dim">{comments.length === 1 ? "1 nota" : `${comments.length} notas`}</span>
        </div>

        <div className="px-4">
          {profeNote && (
            <div className="note cursor-default">
              <span className="stamp stamp-prof">general</span>
              <div>
                <p className="said">{profeNote}</p>
              </div>
            </div>
          )}
          {comments.length === 0 && !profeNote && (
            <p className="py-3 text-small text-paper-dim">
              {viewer?.canWrite
                ? "Todavía no hay notas. Pausa el vídeo donde quieras y escribe abajo."
                : "Todavía no hay notas del profe en este vídeo."}
            </p>
          )}
          {comments.map((c) => {
            const canDelete = viewer && (viewer.id === c.author_id || viewer.isAdmin);
            return (
              <button
                key={c.id}
                type="button"
                className={`note ${selected && selected !== c.id ? "dim" : ""}`}
                onClick={() => pick(c)}
              >
                <span className="stamp stamp-prof">{formatStamp(c.t_seconds)}</span>
                <div className="min-w-0 flex-1">
                  <p className="who">
                    {c.author_name}, {ROLE_LABEL[c.author_role]}
                  </p>
                  <p className="said">{c.body}</p>
                </div>
                {canDelete && (
                  <span
                    role="button"
                    aria-label="Borrar nota"
                    className="text-mini text-paper-dim hover:text-rosa"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(c);
                    }}
                  >
                    ×
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Compositor: solo profes y admin */}
        {viewer?.canWrite ? (
          <form onSubmit={submitNote} className="flex flex-col gap-3 border-t border-ink-3 px-4 py-4">
            <div className="flex items-end gap-4">
              <div className="shrink-0">
                <span className="block text-mini text-paper-dim">Nota en</span>
                <span className="block font-disp text-display font-medium text-brass tabular-nums">{formatStamp(now)}</span>
              </div>
              <textarea
                ref={textRef}
                value={draft}
                onFocus={onDraftFocus}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escribe una nota"
                rows={2}
                className="field flex-1"
                disabled={pending}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" className="btn btn-primary !min-h-10" disabled={pending || !draft.trim()}>
                Guardar en {formatStamp(now)}
              </button>
              {draft && (
                <button type="button" onClick={cancelDraft} className="btn !min-h-10">
                  Cancelar
                </button>
              )}
              <span className="text-mini text-paper-dim">
                El vídeo se pausa mientras escribes. Muévelo para cambiar el momento de la nota.
              </span>
            </div>
          </form>
        ) : (
          !viewer && (
            <p className="border-t border-ink-3 px-4 py-3 text-mini text-paper-dim">
              Las notas las escribe el profe. Si lo eres, <Link href="/login">entra</Link>.
            </p>
          )
        )}
        {error && <p className="notice notice-rosa mx-4 mb-3">{error}</p>}
      </div>
    </div>
  );
}
