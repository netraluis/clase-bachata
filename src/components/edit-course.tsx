"use client";

import { EditDialog } from "@/components/edit-dialog";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { updateCourse } from "@/app/actions/edit";

export function EditCourse({
  course,
  days,
}: {
  course: { id: string; name: string; weekday: number | null; start_time: string | null };
  days: string[];
}) {
  return (
    <EditDialog title="Editar curso" description="Nombre, día de la semana y hora." action={(f) => updateCourse(course.id, f)}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`name-${course.id}`}>Nombre</FieldLabel>
          <Input id={`name-${course.id}`} name="name" defaultValue={course.name} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`weekday-${course.id}`}>Día</FieldLabel>
            <Select name="weekday" defaultValue={course.weekday == null ? "" : String(course.weekday)}>
              <SelectTrigger id={`weekday-${course.id}`} className="w-full">
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
          </Field>
          <Field>
            <FieldLabel htmlFor={`time-${course.id}`}>Hora</FieldLabel>
            <Input id={`time-${course.id}`} name="start_time" type="time" defaultValue={course.start_time?.slice(0, 5) ?? ""} />
          </Field>
        </div>
      </FieldGroup>
    </EditDialog>
  );
}
