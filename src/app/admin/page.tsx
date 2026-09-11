import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoleSelect } from "./role-select";

export const dynamic = "force-dynamic";

type ProfileRow = { id: string; email: string; display_name: string | null; role: Role; created_at: string };

// Gestión de roles. Solo admin (la política RLS de profiles lo garantiza también).
export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, created_at")
    .order("created_at", { ascending: true });
  const profiles = (data ?? []) as ProfileRow[];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Personas</h1>
        <Link href="/" className="text-sm underline">Volver</Link>
      </div>
      <p className="text-sm text-zinc-600">
        Quien entra con Google aparece aquí como alumno. Cambia el rol a profe para que pueda subir vídeos.
      </p>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {profiles.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="flex flex-col">
              <span className="font-medium">{p.display_name ?? p.email}</span>
              {p.display_name && <span className="text-xs text-zinc-600">{p.email}</span>}
            </div>
            <RoleSelect id={p.id} role={p.role} disabled={p.id === user.id} />
          </li>
        ))}
      </ul>
    </main>
  );
}
