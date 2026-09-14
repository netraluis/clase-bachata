"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Pause, Play, Repeat, Volume2, VolumeX, X } from "lucide-react";
import type { Comment } from "@/lib/data";
import { formatStamp } from "@/lib/format";
import type { Role } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { Item, ItemGroup, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemSeparator } from "@/components/ui/item";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { usePersistedBoolean } from "@/hooks/use-persisted-boolean";
import { addComment, deleteComment } from "./actions";

const SPEEDS = ["0.5", "0.75", "1"] as const;
type Viewer = { id: string; role: Role; isAdmin: boolean; canWrite: boolean } | null;
const MIN_GAP = 0.5;

export function Player({
  videoId,
  src,
  poster,
  ratio,
  vertical,
  duration: durationProp,
  comments,
  profeNote,
  viewer,
}: {
  videoId: string;
  src: string;
  poster: string | null;
  ratio: string;
  vertical: boolean;
  duration: number;
  comments: Comment[];
  profeNote: string | null;
  viewer: Viewer;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"a" | "b" | null>(null);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [duration, setDuration] = useState(durationProp);
  const [speed, setSpeed] = useState<string>("1");
  // Sin sonido: se recuerda en el dispositivo (para ensayar sin música).
  const [muted, setMuted] = usePersistedBoolean("player:muted");
  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);
  const [loopMode, setLoopMode] = useState(false);
  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = Number(speed);
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
  const step: "setA" | "setB" | "ready" = a == null ? "setA" : b == null ? "setB" : "ready";

  useEffect(() => {
    if (!loopMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitLoopMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loopMode]);

  function seek(t: number) {
    const video = ref.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(t, duration || t));
    setNow(video.currentTime);
  }
  const pause = () => ref.current?.pause();
  function togglePlay() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }
  function onBarClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    if (loopMode) markAt(t);
    else seek(t);
  }
  // Modo repetir (VLC + Moises): el primer toque marca el inicio, el segundo el
  // fin y empieza a repetir. Con los dos puestos, un toque mueve el extremo más
  // cercano. Los extremos también se arrastran (Anytune).
  function markAt(t: number) {
    if (a == null || (b == null && t <= a + MIN_GAP)) {
      setA(t);
      setB(null);
      seek(t);
      return;
    }
    if (b == null) {
      setB(t);
      seek(a);
      void ref.current?.play();
      return;
    }
    if (Math.abs(t - a) <= Math.abs(t - b)) setA(Math.min(t, b - MIN_GAP));
    else setB(Math.max(t, a + MIN_GAP));
  }
  function enterLoopMode() {
    setLoopMode(true);
    setA(null);
    setB(null);
    setSelected(null);
  }
  function exitLoopMode() {
    setLoopMode(false);
    setA(null);
    setB(null);
  }
  function resetLoop() {
    setA(null);
    setB(null);
    pause();
  }
  // Tocar una marca o una nota: pausa y salta a ese momento.
  function pick(c: Comment) {
    pause();
    setSelected(c.id === selected ? null : c.id);
    seek(c.t_seconds);
  }

  function nudge(which: "a" | "b", delta: number) {
    if (a == null || b == null) return;
    if (which === "a") setA(Math.max(0, Math.min(a + delta, b - MIN_GAP)));
    else setB(Math.max(a + MIN_GAP, Math.min(b + delta, duration)));
  }
  function fracFromEvent(e: React.PointerEvent): number {
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

  // Escribir una nota: el vídeo se pausa al enfocar el campo y el tiempo de la
  // nota es siempre el del cabezal. Si mueves el vídeo, la nota se mueve.
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
  function remove(c: Comment) {
    start(async () => {
      const res = await deleteComment(videoId, c.id);
      if (res.error) setError(res.error);
    });
  }

  const played = duration ? Math.min(100, (now / duration) * 100) : 0;
  const status = [
    muted ? "sin sonido" : null,
    speed !== "1" ? `${speed}×` : null,
    loopMode && step === "setA" ? "toca la barra donde empieza" : null,
    loopMode && step === "setB" && a != null ? `inicio ${formatStamp(a)} · toca donde termina` : null,
    loopOn ? `repitiendo ${formatStamp(a)}–${formatStamp(b)}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const pct = (t: number) => Math.min(100, (t / duration) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Escenario */}
      <div className="relative overflow-hidden rounded-xl bg-black">
        <div className={vertical ? "mx-auto w-full max-w-sm" : "w-full"}>
          <video
            ref={ref}
            playsInline
            preload="metadata"
            src={src}
            poster={poster ?? undefined}
            muted={muted}
            onClick={togglePlay}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || durationProp)}
            className="mx-auto block max-h-[70vh] w-full cursor-pointer bg-black object-contain"
            style={{ aspectRatio: ratio }}
          />
        </div>
        {!playing && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/40">
              <Play className="size-6" />
            </div>
          </div>
        )}
        <div className="stage-shade" />

        <div ref={barRef} className="timeline" onClick={onBarClick} role="slider" aria-label="Posición" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={now}>
          <div className="timeline-played" style={{ width: `${played}%` }} />
          {loopMode && a != null && duration > 0 && (
            <>
              {b != null && <div className="timeline-range" style={{ left: `${pct(a)}%`, width: `${pct(b) - pct(a)}%` }} />}
              <button type="button" className="timeline-handle" style={{ left: `${pct(a)}%` }} aria-label={`Inicio del trozo, ${formatStamp(a)}`} onPointerDown={(e) => onHandleDown("a", e)} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onClick={(e) => e.stopPropagation()} />
              {b != null && (
                <button type="button" className="timeline-handle" style={{ left: `${pct(b)}%` }} aria-label={`Fin del trozo, ${formatStamp(b)}`} onPointerDown={(e) => onHandleDown("b", e)} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onClick={(e) => e.stopPropagation()} />
              )}
            </>
          )}
          {duration > 0 &&
            !loopMode &&
            comments.map((c) => (
              <Tooltip
                key={c.id}
                // Abierto al pasar el ratón (escritorio) o mientras la nota está
                // seleccionada (móvil: un toque abre, otro cierra).
                open={hovered === c.id || selected === c.id}
                onOpenChange={(open) => setHovered(open ? c.id : null)}
              >
                <TooltipTrigger
                  render={
                    <button type="button" className="timeline-pin"
                      style={{ left: `${pct(c.t_seconds)}%` }}
                      aria-label={`Nota en ${formatStamp(c.t_seconds)}`}
                      aria-pressed={selected === c.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        pick(c);
                      }}
                    />
                  }
                />
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs opacity-80">{formatStamp(c.t_seconds)}</p>
                  <p>{c.body}</p>
                </TooltipContent>
              </Tooltip>
            ))}
        </div>
        <div className="timeline-meta">
          <span>{formatStamp(now)}</span>
          <span>{status}</span>
          <span>{formatStamp(duration)}</span>
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={togglePlay}>
          {playing ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
          {playing ? "Pausa" : "Reproducir"}
        </Button>
        <Toggle variant="outline" pressed={muted} onPressedChange={setMuted} aria-label={muted ? "Activar sonido" : "Quitar sonido"}>
          {muted ? <VolumeX /> : <Volume2 />}
          {muted ? "Sin sonido" : "Con sonido"}
        </Toggle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Velocidad</span>
          <ToggleGroup variant="outline" value={[speed]} onValueChange={(v) => v[0] && setSpeed(String(v[0]))}>
            {SPEEDS.map((s) => (
              <ToggleGroupItem key={s} value={s} aria-label={`${s}×`}>
                {s}×
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {!loopMode ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={enterLoopMode} disabled={!duration}>
            <Repeat data-icon="inline-start" />
            Repetir un trozo
          </Button>
          <span className="text-sm text-muted-foreground">Para ensayar un paso una y otra vez.</span>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="size-4" />
              Modo repetir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ItemGroup>
              {(
                [
                  ["setA", "Toca en la barra del vídeo donde empieza el trozo."],
                  ["setB", "Toca donde termina. Empieza a repetirse solo."],
                  ["ready", "Si hace falta, arrastra los extremos verdes o afina con los botones."],
                ] as const
              ).map(([key, text], i) => (
                <Item key={key} size="xs" variant={step === key ? "muted" : "default"} aria-current={step === key ? "step" : undefined}>
                  <ItemMedia>
                    <Badge variant={step === key ? "default" : "outline"}>{i + 1}</Badge>
                  </ItemMedia>
                  <ItemContent>
                    <ItemDescription className={step === key ? "text-foreground" : ""}>{text}</ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </CardContent>
          <CardContent className="flex flex-wrap items-center gap-2">
            {step === "ready" && (
              <>
                <span className="text-sm text-muted-foreground">Inicio</span>
                <Button variant="outline" size="sm" onClick={() => nudge("a", -1)}>−1 s</Button>
                <Button variant="outline" size="sm" onClick={() => nudge("a", 1)}>+1 s</Button>
                <span className="ml-2 text-sm text-muted-foreground">Fin</span>
                <Button variant="outline" size="sm" onClick={() => nudge("b", -1)}>−1 s</Button>
                <Button variant="outline" size="sm" onClick={() => nudge("b", 1)}>+1 s</Button>
                <Button variant="outline" size="sm" className="ml-2" onClick={resetLoop}>Elegir otro trozo</Button>
              </>
            )}
            {step !== "ready" && a != null && (
              <span className="text-sm text-muted-foreground">Inicio en {formatStamp(a)}.</span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button variant="destructive" size="sm" onClick={exitLoopMode}>
                <X data-icon="inline-start" />
                Salir
              </Button>
              <Kbd className="hidden sm:inline-flex">Esc</Kbd>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notas */}
      <Card>
        <CardHeader>
          <CardTitle>Notas del profe</CardTitle>
          <CardDescription>{comments.length === 1 ? "1 nota" : `${comments.length} notas`}</CardDescription>
        </CardHeader>
        <CardContent>
          {comments.length === 0 && !profeNote ? (
            <Empty className="py-6">
              <EmptyHeader>
                <EmptyTitle>Todavía no hay notas</EmptyTitle>
                <EmptyDescription>
                  {viewer?.canWrite ? "Pausa el vídeo donde quieras y escribe abajo." : "El profe todavía no ha dejado notas en este vídeo."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ItemGroup>
              {profeNote && (
                <Item size="sm">
                  <ItemMedia>
                    <Badge variant="secondary">general</Badge>
                  </ItemMedia>
                  <ItemContent>
                    <ItemDescription className="whitespace-pre-line text-foreground">{profeNote}</ItemDescription>
                  </ItemContent>
                </Item>
              )}
              {comments.map((c, i) => {
                const canDelete = viewer && (viewer.id === c.author_id || viewer.isAdmin);
                const dim = selected && selected !== c.id;
                return (
                  <div key={c.id}>
                    {(i > 0 || profeNote) && <ItemSeparator />}
                    <Item size="sm" className={`transition-opacity ${dim ? "opacity-40" : ""}`}>
                      <ItemMedia>
                        <Button variant="outline" size="sm" onClick={() => pick(c)} aria-pressed={selected === c.id}>
                          {formatStamp(c.t_seconds)}
                        </Button>
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle className="whitespace-pre-line font-normal">{c.body}</ItemTitle>
                      </ItemContent>
                      {canDelete && (
                        <ItemActions>
                          <Button variant="ghost" size="icon" aria-label="Borrar nota" onClick={() => remove(c)} disabled={pending}>
                            <X />
                          </Button>
                        </ItemActions>
                      )}
                    </Item>
                  </div>
                );
              })}
            </ItemGroup>
          )}
        </CardContent>

        {viewer?.canWrite ? (
          <CardFooter className="border-t">
            <form onSubmit={submitNote} className="flex w-full flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                <div className="shrink-0">
                  <p className="text-xs text-muted-foreground">Nota en</p>
                  <p className="font-heading text-3xl font-bold text-primary tabular-nums">{formatStamp(now)}</p>
                </div>
                <Textarea
                  value={draft}
                  onFocus={pause}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Escribe una nota"
                  rows={2}
                  className="flex-1"
                  disabled={pending}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={pending || !draft.trim()}>
                  {pending && <Spinner data-icon="inline-start" />}
                  Guardar en {formatStamp(now)}
                </Button>
                {draft && (
                  <Button type="button" variant="ghost" onClick={() => setDraft("")}>
                    Cancelar
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">El vídeo se pausa mientras escribes. Muévelo para cambiar el momento de la nota.</span>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </form>
          </CardFooter>
        ) : (
          !viewer && (
            <CardFooter className="border-t text-xs text-muted-foreground">
              Las notas las escribe el profe. Si lo eres,&nbsp;<Link href="/login" className="underline">entra</Link>.
            </CardFooter>
          )
        )}
      </Card>
    </div>
  );
}
