"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// Selector de fecha (Date Picker de shadcn: Popover + Calendar). Trabaja con
// fechas ISO "YYYY-MM-DD" en hora local, sin pasar por UTC. Con `name` envía
// el valor en el formulario mediante un campo oculto, como el input de fecha nativo.

function parseIso(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function DatePicker({
  id,
  name,
  value,
  defaultValue,
  onChange,
  disabled,
  required,
  placeholder = "Elige una fecha",
}: {
  id?: string;
  name?: string;
  value?: string; // controlado
  defaultValue?: string; // no controlado
  onChange?: (iso: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [inner, setInner] = useState(defaultValue ?? "");
  const iso = value ?? inner;
  const date = parseIso(iso);

  function select(d: Date | undefined) {
    if (!d) return;
    const next = toIso(d);
    if (value === undefined) setInner(next);
    onChange?.(next);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            data-empty={!date}
            className="w-full justify-between font-normal data-[empty=true]:text-muted-foreground"
          />
        }
      >
        {date ? format(date, "PPP", { locale: es }) : placeholder}
        <ChevronDownIcon data-icon="inline-end" />
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar mode="single" selected={date} defaultMonth={date} onSelect={select} locale={es} captionLayout="dropdown" />
      </PopoverContent>
      {name && <Input type="hidden" name={name} value={iso} required={required} readOnly />}
    </Popover>
  );
}

// Hora: Select de shadcn con pasos de 15 min (el input nativo no abre ningún
// selector en escritorio). La lista empieza a las 06:00 (las clases son de
// tarde) y da la vuelta hasta las 05:45. Si el valor guardado no cae en la
// rejilla, se añade en su sitio.
const STEP_MIN = 15;
const FIRST_HOUR = 6;
const TIMES = Array.from({ length: (24 * 60) / STEP_MIN }, (_, i) => {
  const total = (FIRST_HOUR * 60 + i * STEP_MIN) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
});
const order = (t: string) => (Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) - FIRST_HOUR * 60 + 24 * 60) % (24 * 60);
const NO_TIME = { value: "", label: "Sin hora" };

export function TimeSelect({
  id,
  name,
  value,
  defaultValue,
  onChange,
  disabled,
}: {
  id?: string;
  name?: string;
  value?: string; // "HH:MM" controlado
  defaultValue?: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
}) {
  const current = (value ?? defaultValue ?? "").slice(0, 5);
  const times = current && !TIMES.includes(current) ? [...TIMES, current].sort((a, b) => order(a) - order(b)) : TIMES;
  const items = [NO_TIME, ...times.map((t) => ({ value: t, label: t }))];
  return (
    <Select
      name={name}
      items={items}
      disabled={disabled}
      {...(value !== undefined ? { value: current, onValueChange: (v) => onChange?.(String(v ?? "")) } : { defaultValue: current })}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((t) => (
          <SelectItem key={t.value} value={t.value}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
