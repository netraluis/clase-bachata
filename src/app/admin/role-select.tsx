"use client";

import { useState, useTransition } from "react";
import type { Role } from "@/lib/auth";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { setRole } from "./actions";

export function RoleSelect({ id, role, disabled }: { id: string; role: Role; disabled?: boolean }) {
  const [value, setValue] = useState<Role>(role);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value}
        disabled={disabled || pending}
        onValueChange={(v) => {
          const next = String(v) as Role;
          const prev = value;
          setValue(next);
          start(async () => {
            const res = await setRole(id, next);
            if (res.error) {
              setValue(prev);
              setError(res.error);
            } else setError(null);
          });
        }}
      >
        <SelectTrigger size="sm" aria-label="Rol">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="alumno">alumno</SelectItem>
          <SelectItem value="profe">profe</SelectItem>
          <SelectItem value="admin">admin</SelectItem>
        </SelectContent>
      </Select>
      {pending && <Spinner className="size-4" />}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
