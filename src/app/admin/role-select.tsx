"use client";

import { useState, useTransition } from "react";
import type { Role } from "@/lib/auth";
import { setRole } from "./actions";

export function RoleSelect({ id, role, disabled }: { id: string; role: Role; disabled?: boolean }) {
  const [value, setValue] = useState<Role>(role);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={disabled || pending}
        onChange={(e) => {
          const next = e.target.value as Role;
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
        className="rounded-lg border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-black"
      >
        <option value="alumno">alumno</option>
        <option value="profe">profe</option>
        <option value="admin">admin</option>
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
