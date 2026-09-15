"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { EditDialog } from "@/components/edit-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DatePicker, TimeSelect } from "@/components/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemActions, ItemSeparator } from "@/components/ui/item";
import { DeleteButton } from "@/components/delete-button";
import { updateSession, createSession, deleteVideo } from "@/app/actions/edit";
import { endsNextDay, nextDay, slotOccurrences, type SlotLike } from "@/lib/schedule";
import { formatDate, formatDayShort, formatTimeRange } from "@/lib/format";

type SessionForm = { title: string | null; date: string; notes: string | null; start_time: string | null; end_time: string | null; end_date: string | null };
type Mode = "horario" | "suelta";

const occKey = (o: { date: string; start_time: string | null }) => `${o.date}|${o.start_time?.slice(0, 5) ?? ""}`;

// Fecha y horas. Dos modos: "según horario" (una fecha de los días del curso,
// con su hora) o "fecha suelta" (calendario y horas libres). La fecha de fin
// sigue a la de inicio hasta que se toca; si la hora de fin no es posterior a
// la de inicio (mismo día), la clase acaba al día siguiente: se avisa, no se bloquea.
function SessionTimeFields({ id, session, slots }: { id: string; session: SessionForm | null; slots: SlotLike[] }) {
  const [occurrences] = useState(() => slotOccurrences(slots, 4, 8));
  const items = occurrences.map((o) => ({ value: occKey(o), label: `${formatDayShort(o.date)}${formatTimeRange(o) ? ` · ${formatTimeRange(o)}` : ""}` }));
  const initialKey = session ? occKey(session) : "";
  const matches = !!session && !session.end_date && occurrences.some((o) => occKey(o) === initialKey && (o.end_time?.slice(0, 5) ?? "") === (session.end_time?.slice(0, 5) ?? ""));
  const [mode, setMode] = useState<Mode>(occurrences.length === 0 ? "suelta" : !session || matches ? "horario" : "suelta");
  // Clase nueva: por defecto el próximo día del curso (o el último si no hay futuros).
  const [initial] = useState(() => {
    if (session) return session;
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const iso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const next = occurrences.find((o) => o.date >= iso) ?? occurrences[occurrences.length - 1];
    return next ? { date: next.date, start_time: next.start_time, end_time: next.end_time, end_date: null } : null;
  });
  const [date, setDate] = useState(initial?.date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [endTouched, setEndTouched] = useState(!!initial?.end_date);
  const [start, setStart] = useState(initial?.start_time?.slice(0, 5) ?? "");
  const [end, setEnd] = useState(initial?.end_time?.slice(0, 5) ?? "");
  const effectiveEnd = endTouched && endDate ? endDate : date;
  const nextDayEnd = !!date && effectiveEnd === date && endsNextDay(start, end);

  function pickOccurrence(key: string) {
    const o = occurrences.find((x) => occKey(x) === key);
    if (!o) return;
    setDate(o.date);
    setStart(o.start_time?.slice(0, 5) ?? "");
    setEnd(o.end_time?.slice(0, 5) ?? "");
    setEndTouched(false);
    setEndDate("");
  }

  const selectedKey = occKey({ date, start_time: start });
  const occSelect = (
    <Field>
      <FieldLabel htmlFor={`occ-${id}`}>Día del curso</FieldLabel>
      <Select value={items.some((i) => i.value === selectedKey) ? selectedKey : ""} onValueChange={(v) => pickOccurrence(String(v ?? ""))} items={[{ value: "", label: "Elige un día" }, ...items]}>
        <SelectTrigger id={`occ-${id}`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );

  return (
    <>
      {occurrences.length > 0 && (
        <ToggleGroup
          variant="outline"
          value={[mode]}
          onValueChange={(v) => {
            const next = (v as Mode[])[0];
            if (next) setMode(next);
          }}
          aria-label="Tipo de fecha"
        >
          <ToggleGroupItem value="horario">Según horario</ToggleGroupItem>
          <ToggleGroupItem value="suelta">Fecha suelta</ToggleGroupItem>
        </ToggleGroup>
      )}
      {mode === "horario" && occSelect}
      {/* Los campos ocultos llevan siempre el valor al formulario, en cualquier modo. */}
      {mode === "horario" && (
        <>
          <Input type="hidden" name="date" value={date} readOnly />
          <Input type="hidden" name="start_time" value={start} readOnly />
          <Input type="hidden" name="end_time" value={end} readOnly />
        </>
      )}
      {mode === "suelta" && (
      <div className="grid gap-4 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor={`date-${id}`}>Fecha</FieldLabel>
          <DatePicker id={`date-${id}`} name="date" value={date} onChange={setDate} required />
        </Field>
        <Field>
          <FieldLabel htmlFor={`start-${id}`}>Inicio</FieldLabel>
          <TimeSelect id={`start-${id}`} name="start_time" value={start} onChange={setStart} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`end-${id}`}>Fin</FieldLabel>
          <TimeSelect id={`end-${id}`} name="end_time" value={end} onChange={setEnd} />
        </Field>
      </div>
      )}
      {mode === "suelta" && (
      <Field>
        <FieldLabel htmlFor={`end-date-${id}`}>Fecha de fin</FieldLabel>
        <DatePicker
          id={`end-date-${id}`}
          name="end_date"
          value={nextDayEnd ? nextDay(date) : effectiveEnd}
          onChange={(v) => {
            setEndTouched(true);
            setEndDate(v);
          }}
        />
      </Field>
      )}
      {nextDayEnd && (
        <Alert>
          <AlertDescription>Como la hora de fin es anterior a la de inicio, la clase acaba al día siguiente: {formatDate(nextDay(date))}.</AlertDescription>
        </Alert>
      )}
    </>
  );
}

// Campos comunes a editar y crear una clase.
function SessionFields({ id, session, slots }: { id: string; session: SessionForm | null; slots: SlotLike[] }) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`title-${id}`}>Título de la clase</FieldLabel>
        <Input id={`title-${id}`} name="title" defaultValue={session?.title ?? ""} placeholder="Coreo, segunda parte" />
      </Field>
      <SessionTimeFields id={id} session={session} slots={slots} />
      <Field>
        <FieldLabel htmlFor={`notes-${id}`}>Nota de la clase (opcional)</FieldLabel>
        <Textarea id={`notes-${id}`} name="notes" rows={3} defaultValue={session?.notes ?? ""} />
      </Field>
    </FieldGroup>
  );
}

// Vídeos de la clase: lista con papelera (solo admin, canDelete) y enlace
// a subir uno nuevo a esta clase (/subir?session=).
function SessionVideos({ sessionId, videos, canDelete }: { sessionId: string; videos: { id: string; title: string }[]; canDelete: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>Vídeos de la clase</FieldLabel>
      {videos.length > 0 && (
        <ItemGroup>
          {videos.map((v, i) => (
            <div key={v.id}>
              {i > 0 && <ItemSeparator />}
              <Item size="sm">
                <ItemContent>
                  <ItemTitle className="truncate">{v.title}</ItemTitle>
                </ItemContent>
                {canDelete && (
                  <ItemActions>
                    <DeleteButton
                      title={`Borrar el vídeo «${v.title}»`}
                      description="Se borra el vídeo de R2 con sus notas. Esta acción no se puede deshacer."
                      action={deleteVideo.bind(null, v.id)}
                    />
                  </ItemActions>
                )}
              </Item>
            </div>
          ))}
        </ItemGroup>
      )}
      <Button variant="outline" size="sm" className="self-start" nativeButton={false} render={<Link href={`/subir?session=${sessionId}`} />}>
        <Upload data-icon="inline-start" />
        Subir vídeo
      </Button>
    </div>
  );
}

export function EditSession({
  session,
  slots,
  videos = [],
  canDelete = false,
}: {
  session: SessionForm & { id: string };
  slots: SlotLike[];
  videos?: { id: string; title: string }[];
  canDelete?: boolean;
}) {
  return (
    <EditDialog title="Editar clase" description="Título, fecha, hora y nota de la clase." action={(f) => updateSession(session.id, f)}>
      <SessionFields id={session.id} session={session} slots={slots} />
      <SessionVideos sessionId={session.id} videos={videos} canDelete={canDelete} />
    </EditDialog>
  );
}

// Clase suelta: fecha fija fuera del horario semanal (taller, ensayo, extra).
export function NewSession({ courseId, slots }: { courseId: string; slots: SlotLike[] }) {
  return (
    <EditDialog
      title="Nueva clase"
      description="Un día del horario del curso o una fecha suelta. Después se le suben vídeos como a cualquier otra."
      action={(f) => createSession(courseId, f)}
      submitLabel="Crear"
      trigger={
        <Button variant="outline" size="sm">
          <Plus data-icon="inline-start" />
          Nueva clase
        </Button>
      }
    >
      <SessionFields id={`new-${courseId}`} session={null} slots={slots} />
    </EditDialog>
  );
}
