"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Pause, Play, Volume2, VolumeX, X } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import { Item, ItemGroup, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemSeparator } from "@/components/ui/item";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { usePersistedBoolean } from "@/hooks/use-persisted-boolean";
import { addComment, deleteComment } from "./actions";
import { Filmstrip } from "./filmstrip";

const SPEEDS = ["0.5", "0.75", "1"] as const;
type Viewer = { id: string; role: Role; isAdmin: boolean; canWrite: boolean } | null;

export function Player({
  videoId,
  src,
  poster,
  filmstrip,
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
  filmstrip: string | null;
  ratio: string;
  vertical: boolean;
  duration: number;
  comments: Comment[];
  profeNote: string | null;
  viewer: Viewer;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [duration, setDuration] = useState(durationProp);
  const [speed, setSpeed] = useState<string>("1");
  // Sin sonido: se recuerda en el dispositivo (para ensayar sin música).
  const [muted, setMuted] = usePersistedBoolean("player:muted");
  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);
  // Trozo que se repite: de entrada, el vídeo entero.
  const [a, setA] = useState<number>(0);
  const [b, setB] = useState<number>(durationProp);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // Red de seguridad: si el navegador no deja reproducir con nuestro botón,
  // se muestran los controles nativos del vídeo y el motivo.
  const [playError, setPlayError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = Number(speed);
  }, [speed]);

  // Bucle A-B con requestAnimationFrame: timeupdate solo dispara ~4 veces/s.
  useEffect(() => {
    const video = ref.current;
    if (!video || b <= a) return;
    let raf = 0;
    const tick = () => {
      if (video.currentTime >= b || video.currentTime < a - 0.05) video.currentTime = a;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [a, b]);

  const trimmed = a > 0.05 || (duration > 0 && b < duration - 0.05);

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
    if (video.paused) {
      video.play().catch((e: unknown) => setPlayError(e instanceof Error ? `${e.name}: ${e.message}` : "no se pudo reproducir"));
    } else video.pause();
  }
  function onVideoError() {
    const err = ref.current?.error;
    const names = ["", "abortado", "error de red", "no se pudo decodificar", "formato no soportado"];
    setPlayError(err ? `${names[err.code] ?? "error"} (código ${err.code})` : "error desconocido");
  }
  function onBarClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * duration);
  }



  // Tocar una marca o una nota: pausa y salta a ese momento.
  function pick(c: Comment) {
    pause();
    setSelected(c.id === selected ? null : c.id);
    seek(c.t_seconds);
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
    trimmed ? `repitiendo ${formatStamp(a)}–${formatStamp(b)}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const pct = (t: number) => Math.min(100, (t / duration) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Escenario + tira de fotogramas, pegados y del mismo ancho */}
      <div className="flex flex-col gap-1">
      <div className="relative overflow-hidden rounded-xl bg-black">
        <div className={vertical ? "mx-auto w-full max-w-sm" : "w-full"}>
          <video
            ref={ref}
            playsInline
            preload="metadata"
            controls={playError != null}
            onError={onVideoError}
            src={src}
            poster={poster ?? undefined}
            muted={muted}
            onClick={togglePlay}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration || durationProp;
              setDuration(d);
              if (b === durationProp || b === 0) setB(d);
            }}
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
          {duration > 0 &&
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

      {playError && (
        <Alert variant="destructive">
          <AlertDescription>
            El navegador no ha reproducido el vídeo ({playError}). Prueba con los controles del propio vídeo.
          </AlertDescription>
        </Alert>
      )}

      {/* Tira de fotogramas: elige el trozo que se repite arrastrando los extremos */}
      {duration > 0 && (
        <Filmstrip
          image={filmstrip}
          duration={duration}
          a={a}
          b={Math.min(b, duration)}
          now={now}
          onChange={(na, nb) => {
            setA(na);
            setB(nb);
          }}
          onSeek={seek}
        />
      )}
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
