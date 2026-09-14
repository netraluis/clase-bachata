import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getSchool } from "@/lib/data";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { HeaderNav, MobileMenu, type HeaderUser } from "@/components/header-nav";
import { Logo } from "@/components/logo";
import { HeaderBrandText } from "@/components/header-title";

// Cabecera común: escuela, navegación (en línea en escritorio, panel en móvil) y sesión.
export async function Header() {
  const [session, school] = await Promise.all([getSessionUser(), getSchool()]);
  const user: HeaderUser = session
    ? { initials: initials(session.name ?? session.email), role: session.role, canUpload: session.canUpload, isAdmin: session.isAdmin }
    : null;

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-4xl items-center gap-2 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 font-heading text-lg font-bold">
          <Link href="/events" aria-label="Clases">
            <Logo className="size-7 shrink-0 text-primary" />
          </Link>
          <HeaderBrandText fallback={school?.name ?? "Compás"} />
        </div>

        <div className="ml-2">
          <HeaderNav user={user} />
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {!user && (
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/login" />}>
              Entrar
            </Button>
          )}
          {user && (
            <>
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">{user.initials}</AvatarFallback>
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

        <div className="ml-auto md:hidden">
          <MobileMenu user={user} />
        </div>
      </div>
    </header>
  );
}
