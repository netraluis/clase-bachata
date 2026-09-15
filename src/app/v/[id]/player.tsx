"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { FastForward, Maximize, MessageSquareText, Pause, Play, Volume2, VolumeX, Wrench, X } from "lucide-react";
import type { Comment } from "@/lib/data";
import { formatStamp } from "@/lib/format";
import type { Role } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Item, ItemGroup, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemSeparator } from "@/components/ui/item";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { usePersistedBoolean } from "@/hooks/use-persisted-boolean";
import { addComment, deleteComment } from "./actions";
import { Filmstrip } from "./filmstrip";

type Viewer = { id: string; role: Role; isAdmin: boolean; canWrite: boolean } | null;
// Panel bajo el vídeo, elegido desde la barra flotante: herramientas (bucle,
// pausa, velocidad, sonido), notas, o nada (solo el vídeo).
type Panel = "tools" | "notes" | "video";

function fmtSpeed(v: number): string {
  return String(Math.round(v * 100) / 100);
}

export function Player({
  videoId,
  src,
  poster,
  filmstrip,
  ratio,
  duration: durationProp,
  comments,
  profeNote,
  viewer,
  toolsExtra,
}: {
  videoId: string;
  src: string;
  poster: string | null;
  filmstrip: string | null;
  ratio: string;
  duration: number;
  comments: Comment[];
  profeNote: string | null;
  viewer: Viewer;
  toolsExtra?: React.ReactNode; // p. ej. la papelera del admin, al final de herramientas
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [duration, setDuration] = useState(durationProp);
  const [speed, setSpeed] = useState<number>(1);
  const [panel, setPanel] = useState<Panel>("tools");
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
    if (ref.current) ref.current.playbackRate = speed;
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
    speed !== 1 ? `${fmtSpeed(speed)}×` : null,
    trimmed ? `repitiendo ${formatStamp(a)}–${formatStamp(b)}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const pct = (t: number) => Math.min(100, (t / duration) * 100);

  const canWrite = !!viewer?.canWrite;
  // Hueco inferior: la pastilla, y con el campo de escribir además su alto.
  const bottomPad = panel === "notes" && canWrite ? "pb-40" : "pb-24";

  return (
    <div className={`flex flex-1 flex-col ${bottomPad}`}>
      {/* Escenario a sangre, sobre negro, fijo arriba mientras el resto se desplaza */}
      <div className="sticky top-0 z-30 bg-black">
        <div className="relative mx-auto w-full max-w-4xl">
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
            // En móvil el vídeo cede alto al panel; con las notas, un poco más.
            className={`mx-auto block w-full cursor-pointer bg-black object-contain ${
              panel === "video" ? "max-h-[calc(100dvh-8rem)]" : panel === "notes" ? "max-h-[40vh] md:max-h-[70vh]" : "max-h-[50vh] md:max-h-[70vh]"
            }`}
            style={{ aspectRatio: ratio }}
          />
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
      </div>

      {/* Panel: ocupa el resto de la pantalla, sin tarjeta */}
      <div className={`mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 pt-4 sm:px-6 ${panel === "video" ? "hidden" : ""}`}>
        {playError && (
          <Alert variant="destructive">
            <AlertDescription>
              El navegador no ha reproducido el vídeo ({playError}). Prueba con los controles del propio vídeo.
            </AlertDescription>
          </Alert>
        )}

        {panel === "tools" && (
          <>
            <h2 className="text-2xl font-bold">Herramientas</h2>
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
            {/* Controles: solo símbolos */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={togglePlay} aria-label={playing ? "Pausa" : "Reproducir"}>
                {playing ? <Pause /> : <Play />}
              </Button>
              <Toggle variant="outline" pressed={muted} onPressedChange={setMuted} aria-label={muted ? "Activar sonido" : "Quitar sonido"} className="size-9 px-0">
                {muted ? <VolumeX /> : <Volume2 />}
              </Toggle>
              <Popover>
                <PopoverTrigger
                  render={<Button variant={speed !== 1 ? "secondary" : "outline"} size={speed !== 1 ? "sm" : "icon"} aria-label={`Velocidad ${fmtSpeed(speed)}×`} />}
                >
                  <FastForward />
                  {speed !== 1 && <span className="tabular-nums">{fmtSpeed(speed)}×</span>}
                </PopoverTrigger>
                <PopoverContent className="w-64" align="start">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Velocidad</span>
                    <span className="font-medium tabular-nums">{fmtSpeed(speed)}×</span>
                  </div>
                  <Slider
                    className="mt-3"
                    value={[speed]}
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    aria-label="Velocidad de reproducción"
                    onValueChange={(v) => setSpeed(Number(Array.isArray(v) ? v[0] : v))}
                  />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>0.5×</span>
                    <span>1×</span>
                    <span>1.5×</span>
                  </div>
                </PopoverContent>
              </Popover>
              {toolsExtra && <div className="ml-auto">{toolsExtra}</div>}
            </div>
          </>
        )}

        {panel === "notes" && (
          <>
            <h2 className="text-2xl font-bold">Notas del profe</h2>
            {comments.length === 0 && !profeNote ? (
              <Empty className="py-6">
                <EmptyHeader>
                  <EmptyTitle>Todavía no hay notas</EmptyTitle>
                  <EmptyDescription>
                    {canWrite ? "Pausa el vídeo donde quieras y escribe abajo." : "El profe todavía no ha dejado notas en este vídeo."}
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
                  const isSel = selected === c.id;
                  const dim = selected && !isSel;
                  return (
                    <div key={c.id}>
                      {(i > 0 || profeNote) && <ItemSeparator />}
                      {/* Toda la fila selecciona la nota; la marca de la barra se selecciona a la vez. */}
                      <Item
                        size="sm"
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSel}
                        onClick={() => pick(c)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            pick(c);
                          }
                        }}
                        className={`cursor-pointer transition-opacity ${isSel ? "bg-muted" : ""} ${dim ? "opacity-40" : ""}`}
                      >
                        <ItemMedia>
                          <Button variant={isSel ? "default" : "outline"} size="sm" tabIndex={-1} aria-hidden="true" className="pointer-events-none">
                            {formatStamp(c.t_seconds)}
                          </Button>
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle className="whitespace-pre-line font-normal">{c.body}</ItemTitle>
                        </ItemContent>
                        {canDelete && (
                          <ItemActions>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Borrar nota"
                              onClick={(e) => {
                                e.stopPropagation();
                                remove(c);
                              }}
                              disabled={pending}
                            >
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
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>

      {/* Pegado abajo: el campo de escribir (profes, con las notas abiertas) y la pastilla */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-3 pb-4">
        {panel === "notes" && canWrite && (
          <form onSubmit={submitNote} className="pointer-events-auto flex w-full max-w-4xl items-end gap-2 border-t bg-background px-4 pt-3 sm:px-6">
            <Textarea
              value={draft}
              onFocus={pause}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Nota en ${formatStamp(now)}…`}
              rows={1}
              className="min-h-9 flex-1 resize-none"
              disabled={pending}
              aria-label="Nueva nota"
            />
            <Button type="submit" disabled={pending || !draft.trim()}>
              {pending && <Spinner data-icon="inline-start" />}
              {formatStamp(now)}
            </Button>
          </form>
        )}
        <ToggleGroup
          value={[panel]}
          onValueChange={(v) => {
            const next = (v as Panel[])[0];
            if (next) setPanel(next);
          }}
          aria-label="Panel"
          className="pointer-events-auto rounded-4xl bg-popover p-1 shadow-2xl ring-1 ring-foreground/10"
        >
          <ToggleGroupItem value="tools" aria-label="Herramientas">
            <Wrench />
          </ToggleGroupItem>
          <ToggleGroupItem value="notes" aria-label="Notas">
            <MessageSquareText />
            {comments.length > 0 && <span className="tabular-nums">{comments.length}</span>}
          </ToggleGroupItem>
          <ToggleGroupItem value="video" aria-label="Solo el vídeo">
            <Maximize />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
