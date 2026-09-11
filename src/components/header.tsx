import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getSchool } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Cabecera común: escuela, navegación y estado de sesión. Server Component.
export async function Header() {
  const [user, school] = await Promise.all([getSessionUser(), getSchool()]);

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
        <Link href="/events" className="font-heading text-lg font-bold">
          {school?.name ?? "Compás"}
        </Link>

        <nav className="ml-2 flex items-center gap-1">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/events" />}>
            Clases
          </Button>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/lessons" />}>
            Cursos
          </Button>
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!user && (
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/login" />}>
              Entrar
            </Button>
          )}
          {user && (
            <>
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">{initials(user.name ?? user.email)}</AvatarFallback>
              </Avatar>
              <Badge variant={user.canUpload ? "default" : "secondary"}>{user.role}</Badge>
            </>
          )}
          {user?.isAdmin && (
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/admin" />}>
              Personas
            </Button>
          )}
          {user?.canUpload && (
            <Button size="sm" nativeButton={false} render={<Link href="/subir" />}>
              Subir vídeo
            </Button>
          )}
          {user && (
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm" type="submit">
                Salir
              </Button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}

export function initials(s: string): string {
  const parts = s.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
