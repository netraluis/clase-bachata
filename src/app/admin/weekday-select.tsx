"use client";

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// Selector de día para el formulario de nuevo curso. Envía `weekday` con el form.
export function WeekdaySelect({ days }: { days: string[] }) {
  return (
    <Select name="weekday" defaultValue="">
      <SelectTrigger id="weekday" aria-label="Día de la semana">
        <SelectValue placeholder="Sin día" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">Sin día</SelectItem>
        {days.map((d, i) => (
          <SelectItem key={i} value={String(i)}>
            {d}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
