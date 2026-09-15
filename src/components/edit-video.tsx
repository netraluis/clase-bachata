"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { EditDialog } from "@/components/edit-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateVideo } from "@/app/actions/edit";
import { Uploader, type LockedSession } from "@/app/subir/uploader";

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

// Subir un vídeo a una clase concreta sin salir del diálogo de la clase.
export function UploadDialog({ session }: { session: LockedSession }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="self-start" />}>
        <Upload data-icon="inline-start" />
        Subir vídeo
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir a {session.label}</DialogTitle>
          <DialogDescription>{session.courseName}</DialogDescription>
        </DialogHeader>
        <Uploader
          courses={[{ id: session.courseId, name: session.courseName, weekdays: [] }]}
          detectedId={session.courseId}
          session={session}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
