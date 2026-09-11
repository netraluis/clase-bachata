import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getSchool } from "@/lib/data";

// Cabecera común: marca + estado de sesión. Server Component.
export async function Header() {
  const [user, school] = await Promise.all([getSessionUser(), getSchool()]);

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 sm:px-6">
        <Link href="/" className="mark">
          Comp<em>á</em>s
        </Link>
        <span className="text-mini text-paper-dim">{school?.name ?? "Clase de bachata"}</span>

        <nav className="ml-auto flex flex-wrap items-center gap-3 text-small">
          {!user && (
            <Link href="/login" className="text-paper-dim hover:text-paper">
              Entrar
            </Link>
          )}
          {user && (
            <span className="flex items-center gap-2 text-paper-dim">
              <span className={`av ${user.canUpload ? "av-p" : ""}`}>{initials(user.name ?? user.email)}</span>
              <span className={`tag ${user.canUpload ? "tag-p" : ""}`}>{user.role}</span>
            </span>
          )}
          {user?.isAdmin && (
            <Link href="/admin" className="text-paper-dim hover:text-paper">
              Personas
            </Link>
          )}
          {user?.canUpload && (
            <Link href="/subir" className="btn btn-primary !min-h-9">
              Subir vídeo
            </Link>
          )}
          {user && (
            <form action="/auth/signout" method="post">
              <button className="text-paper-dim hover:text-paper">Salir</button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}

export function initials(s: string): string {
  const parts = s.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
