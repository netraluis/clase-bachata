"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

type Result = { ok: true } | { ok: false; error: string };

// Botón (lápiz por defecto, o el `trigger` dado) que abre un diálogo con un
// formulario. `children` son los campos; `action` recibe el FormData y
// devuelve ok o el error.
export function EditDialog({
  title,
  description,
  action,
  children,
  triggerLabel = "Editar",
  trigger,
  submitLabel = "Guardar",
}: {
  title: string;
  description?: string;
  action: (form: FormData) => Promise<Result>;
  children: React.ReactNode;
  triggerLabel?: string;
  trigger?: React.ReactElement;
  submitLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation(); // un diálogo dentro de otro no debe enviar también el de fuera
    const form = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = await action(form);
      if (res.ok) setOpen(false);
      else setError(res.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger render={<Button variant="ghost" size="icon" aria-label={triggerLabel} />}>
          <Pencil />
        </DialogTrigger>
      )}
      {/* Si el formulario no cabe (móvil, subida desplegada), se desplaza dentro del diálogo. */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
