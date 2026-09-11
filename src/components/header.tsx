import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getSchool } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { HeaderNav } from "@/components/header-nav";

// Cabecera común: escuela, navegación con la sección actual marcada, y sesión.
export async function Header() {
  const [user, school] = await Promise.all([getSessionUser(), getSchool()]);

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
        <Link href="/events" className="font-heading text-lg font-bold">
          {school?.name ?? "Compás"}
        </Link>

        <div className="ml-2">
          <HeaderNav canUpload={!!user?.canUpload} isAdmin={!!user?.isAdmin} />
        </div>

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
              <form action="/auth/signout" method="post">
                <Button variant="ghost" size="sm" type="submit">
                  Salir
                </Button>
              </form>
            </>
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
