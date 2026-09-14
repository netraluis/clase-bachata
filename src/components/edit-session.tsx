"use client";

import { EditDialog } from "@/components/edit-dialog";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateSession } from "@/app/actions/edit";

export function EditSession({ session }: { session: { id: string; title: string | null; date: string; notes: string | null } }) {
  return (
    <EditDialog title="Editar clase" description="Título, fecha y nota de la clase." action={(f) => updateSession(session.id, f)}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`title-${session.id}`}>Título de la clase</FieldLabel>
          <Input id={`title-${session.id}`} name="title" defaultValue={session.title ?? ""} placeholder="Coreo, segunda parte" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`date-${session.id}`}>Fecha</FieldLabel>
          <Input id={`date-${session.id}`} name="date" type="date" defaultValue={session.date} required />
        </Field>
        <Field>
          <FieldLabel htmlFor={`notes-${session.id}`}>Nota de la clase (opcional)</FieldLabel>
          <Textarea id={`notes-${session.id}`} name="notes" rows={3} defaultValue={session.notes ?? ""} />
        </Field>
      </FieldGroup>
    </EditDialog>
  );
}
