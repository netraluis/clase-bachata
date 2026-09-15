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
      {/* Cabecera y botones fijos; si los campos no caben (móvil, subida
          desplegada), se desplazan ellos solos dentro del diálogo. */}
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0">
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-1">
            {children}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="px-6 pt-4 pb-6">
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
