import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/components/header";
import { RoleSelect } from "./role-select";

export const dynamic = "force-dynamic";

type ProfileRow = { id: string; email: string; display_name: string | null; role: Role; created_at: string };

// Gestión de roles. Solo admin (la política RLS de profiles lo garantiza también).
export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const supabase = await createClient();
  const [{ data: profiles }, { count: videoCount }] = await Promise.all([
    supabase.from("profiles").select("id, email, display_name, role, created_at").order("created_at"),
    supabase.from("videos").select("id", { count: "exact", head: true }),
  ]);
  const people = (profiles ?? []) as ProfileRow[];
  const profes = people.filter((p) => p.role !== "alumno").length;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <Link href="/" className="text-small text-paper-dim hover:text-paper">
        ← Todos los vídeos
      </Link>
      <div>
        <h1 className="text-display">Personas</h1>
        <p className="mt-1 text-small text-paper-dim">
          Quien entra con Google aparece aquí como alumno. Cambia el rol a profe para que pueda subir vídeos.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-3 gap-px bg-ink-3">
          <Stat label="Personas" value={people.length} />
          <Stat label="Profes y admin" value={profes} />
          <Stat label="Vídeos" value={videoCount ?? 0} />
        </div>
        <div className="px-5 pb-3">
          {people.map((p) => (
            <div key={p.id} className="flex items-center gap-3 border-t border-ink-3 py-3 text-small first:border-t-0">
              <span className={`av ${p.role !== "alumno" ? "av-p" : ""}`}>{initials(p.display_name ?? p.email)}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{p.display_name ?? p.email}</div>
                {p.display_name && <div className="truncate text-mini text-paper-dim">{p.email}</div>}
              </div>
              <RoleSelect id={p.id} role={p.role} disabled={p.id === user.id} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-ink-2 px-5 py-4">
      <small className="block text-mini text-paper-dim">{label}</small>
      <b className="font-disp text-display font-medium">{value}</b>
    </div>
  );
}
