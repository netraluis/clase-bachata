"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, ChevronDown } from "lucide-react";
import { EditDialog } from "@/components/edit-dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateVideo } from "@/app/actions/edit";
import { Uploader, type LockedSession } from "@/components/uploader";

// Título y nota general de un vídeo (desde "Editar clase").
export function EditVideo({ video }: { video: { id: string; title: string; notes: string | null } }) {
  return (
    <EditDialog title="Editar vídeo" description="Título y nota general. Las notas por momento se dejan viendo el vídeo." action={(f) => updateVideo(video.id, f)}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`vtitle-${video.id}`}>Título del vídeo</FieldLabel>
          <Input id={`vtitle-${video.id}`} name="title" defaultValue={video.title} required />
        </Field>
        <Field>
          <FieldLabel htmlFor={`vnotes-${video.id}`}>Nota general (opcional)</FieldLabel>
          <Textarea id={`vnotes-${video.id}`} name="notes" rows={3} defaultValue={video.notes ?? ""} />
        </Field>
      </FieldGroup>
    </EditDialog>
  );
}

// Subir un vídeo a la clase: el botón despliega el uploader dentro del
// propio diálogo de la clase; al terminar se pliega y la lista se refresca.
export function UploadInline({ session }: { session: LockedSession }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-4">
      <CollapsibleTrigger render={<Button variant="outline" size="sm" className="self-start" />}>
        <Upload data-icon="inline-start" />
        Subir vídeo
        <ChevronDown data-icon="inline-end" className={open ? "rotate-180" : ""} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {open && (
          <Uploader
            session={session}
            onDone={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
