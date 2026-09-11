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
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [draftAt, setDraftAt] = useState<number | null>(null);
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
  function markA() {
    setA(now);
    if (b != null && b <= now) setB(null);
  }
  function markB() {
    if (a == null) setA(0);
    setB(now);
    if (a != null && now > a) seek(a);
  }

  // Escribir una nota: el vídeo se pausa y el momento queda fijado en el
  // fotograma que se ve. Es lo que hacen Frame.io y Vimeo Review.
  function anchorHere() {
    pause();
    setDraftAt(ref.current?.currentTime ?? now);
    textRef.current?.focus();
  }
  function onDraftFocus() {
    if (draftAt == null) anchorHere();
    else pause();
  }
  function submitNote(e: React.FormEvent) {
    e.preventDefault();
    const t = draftAt ?? now;
    const body = draft;
    setError(null);
    start(async () => {
      const res = await addComment(videoId, t, body);
      if (res.error) setError(res.error);
      else {
        setDraft("");
        setDraftAt(null);
      }
    });
  }
  function cancelDraft() {
    setDraft("");
    setDraftAt(null);
  }
  function remove(c: Comment) {
    start(async () => {
      const res = await deleteComment(videoId, c.id);
      if (res.error) setError(res.error);
    });
  }

  const played = duration ? Math.min(100, (now / duration) * 100) : 0;
  const status = [speed !== 1 ? `${speed}×` : null, loopOn ? "en bucle" : null].filter(Boolean).join(", ");
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
          className="bar"
          onClick={onBarClick}
          role="slider"
          aria-label="Posición"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={now}
        >
          <div className="played" style={{ width: `${played}%` }} />
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
        {viewer?.canWrite && (
          <button type="button" onClick={anchorHere} className="btn btn-primary !min-h-9">
            Nota en {formatStamp(now)}
          </button>
        )}
        <span className="ml-2 text-small text-paper-dim">Velocidad</span>
        {SPEEDS.map((s) => (
          <button key={s} type="button" onClick={() => setSpeed(s)} aria-pressed={speed === s} className="chip">
            {s === 1 ? "1×" : `${s}×`}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-small text-paper-dim">Bucle</span>
        <button type="button" onClick={markA} aria-pressed={a != null} className="chip">
          {a != null ? `Inicio ${formatStamp(a)}` : "Marcar inicio"}
        </button>
        <button type="button" onClick={markB} aria-pressed={b != null} className="chip">
          {b != null ? `Fin ${formatStamp(b)}` : "Marcar fin"}
        </button>
        {(a != null || b != null) && (
          <button type="button" onClick={() => { setA(null); setB(null); }} className="chip">
            Quitar
          </button>
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
          <form onSubmit={submitNote} className="flex flex-col gap-2 border-t border-ink-3 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 text-mini text-paper-dim">
              {draftAt != null ? (
                <>
                  <button type="button" className="stamp stamp-prof" onClick={anchorHere} title="Mover la nota al momento actual">
                    en {formatStamp(draftAt)}
                  </button>
                  <span>La nota queda en el fotograma que ves. Mueve el vídeo y pulsa el tiempo para cambiarla.</span>
                </>
              ) : (
                <span>Al escribir, el vídeo se pausa y la nota queda en ese momento.</span>
              )}
            </div>
            <div className="flex items-end gap-2">
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
              <div className="flex flex-col gap-1">
                <button type="submit" className="btn btn-primary !min-h-10" disabled={pending || !draft.trim()}>
                  Guardar
                </button>
                {(draft || draftAt != null) && (
                  <button type="button" onClick={cancelDraft} className="btn !min-h-8 text-mini">
                    Cancelar
                  </button>
                )}
              </div>
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
