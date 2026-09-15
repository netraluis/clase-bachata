"use client";

import { Plus } from "lucide-react";
import { EditDialog } from "@/components/edit-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SlotsFields } from "@/components/slots-fields";
import { updateCourse, createCourse } from "@/app/actions/edit";

export function EditCourse({
  course,
}: {
  course: { id: string; name: string; slots: { weekday: number; start_time: string | null; end_time: string | null }[] };
}) {
  return (
    <EditDialog title="Editar curso" description="Nombre y horario semanal. Las clases sueltas se crean desde la página del curso." action={(f) => updateCourse(course.id, f)}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`name-${course.id}`}>Nombre</FieldLabel>
          <Input id={`name-${course.id}`} name="name" defaultValue={course.name} required />
        </Field>
        <SlotsFields initial={course.slots} idPrefix={course.id} />
      </FieldGroup>
    </EditDialog>
  );
}

export function NewCourse() {
  return (
    <EditDialog
      title="Nuevo curso"
      description="Nombre y horario semanal. Las clases se crean después desde la página del curso."
      action={createCourse}
      submitLabel="Crear"
      trigger={
        <Button variant="outline" size="sm">
          <Plus data-icon="inline-start" />
          Nuevo curso
        </Button>
      }
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="new-course-name">Nombre</FieldLabel>
          <Input id="new-course-name" name="name" required placeholder="Salsa intermedio" />
        </Field>
        <SlotsFields initial={[]} idPrefix="new-course" />
      </FieldGroup>
    </EditDialog>
  );
}
