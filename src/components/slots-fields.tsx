"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { TimeSelect } from "@/components/date-picker";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { WEEKDAYS } from "@/lib/format";
import { endsNextDay } from "@/lib/schedule";

export type SlotDraft = { key: number; weekday: number; start: string; end: string };

// Los ítems del Select llevan etiqueta: sin `items`, Base UI pintaría el número del día.
const DAY_ITEMS = WEEKDAYS.map((d, i) => ({ value: String(i), label: d.charAt(0).toUpperCase() + d.slice(1) }));

const NONE = { value: "", label: "Sin día" };

// Selector de día de la semana; envía `name` con el formulario. Con `allowNone`
// ofrece "Sin día" (valor vacío, que el servidor ignora).
export function WeekdaySelect({ name, id, defaultValue, allowNone = false }: { name: string; id?: string; defaultValue: string; allowNone?: boolean }) {
  const items = allowNone ? [NONE, ...DAY_ITEMS] : DAY_ITEMS;
  return (
    <Select name={name} defaultValue={defaultValue} items={items}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((d) => (
          <SelectItem key={d.value} value={d.value}>
            {d.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Horarios semanales de un curso dentro de un formulario: cada fila envía
// slot_weekday / slot_start / slot_end; el servidor los lee con getAll.
export function SlotsFields({ initial, idPrefix }: { initial: { weekday: number; start_time: string | null; end_time: string | null }[]; idPrefix: string }) {
  const [rows, setRows] = useState<SlotDraft[]>(() =>
    initial.map((s, i) => ({ key: i, weekday: s.weekday, start: s.start_time?.slice(0, 5) ?? "", end: s.end_time?.slice(0, 5) ?? "" })),
  );
  const [nextKey, setNextKey] = useState(initial.length);

  function update(key: number, patch: Partial<SlotDraft>) {
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  }

  function add() {
    setRows((r) => [...r, { key: nextKey, weekday: 4, start: "", end: "" }]);
    setNextKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-3">
      <FieldLabel>Horario semanal</FieldLabel>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Sin horario fijo.</p>}
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 sm:grid-cols-[1fr_7rem_7rem_auto]">
          <Field className="col-span-3 sm:col-span-1">
            <FieldLabel htmlFor={`${idPrefix}-day-${row.key}`}>Día</FieldLabel>
            <WeekdaySelect name="slot_weekday" id={`${idPrefix}-day-${row.key}`} defaultValue={String(row.weekday)} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-start-${row.key}`}>Inicio</FieldLabel>
            <TimeSelect id={`${idPrefix}-start-${row.key}`} name="slot_start" value={row.start} onChange={(v) => update(row.key, { start: v })} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-end-${row.key}`}>Fin</FieldLabel>
            <TimeSelect id={`${idPrefix}-end-${row.key}`} name="slot_end" value={row.end} onChange={(v) => update(row.key, { end: v })} />
          </Field>
          <Button type="button" variant="ghost" size="icon" aria-label="Quitar horario" onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}>
            <X />
          </Button>
          {endsNextDay(row.start, row.end) && <p className="col-span-full text-sm text-muted-foreground">Acaba al día siguiente.</p>}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={add}>
        <Plus data-icon="inline-start" />
        Añadir día
      </Button>
    </div>
  );
}
