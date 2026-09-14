"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";

type Item = { href: string; label: string; match: (path: string) => boolean };
export type HeaderUser = { initials: string; role: string; canUpload: boolean; isAdmin: boolean } | null;

function useItems(user: HeaderUser): Item[] {
  return [
    { href: "/events", label: "Clases", match: (p) => p === "/" || p.startsWith("/events") || p.startsWith("/v/") },
    { href: "/lessons", label: "Cursos", match: (p) => p.startsWith("/lessons") },
    ...(user?.canUpload ? [{ href: "/subir", label: "Subir", match: (p: string) => p.startsWith("/subir") }] : []),
    ...(user?.isAdmin ? [{ href: "/admin", label: "Personas", match: (p: string) => p.startsWith("/admin") }] : []),
  ];
}

// Menú principal en escritorio: enlaces en línea con la sección actual marcada.
export function HeaderNav({ user }: { user: HeaderUser }) {
  const path = usePathname();
  const items = useItems(user);
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map((it) => {
        const active = it.match(path);
        return (
          <Button key={it.href} variant={active ? "secondary" : "ghost"} size="sm" nativeButton={false} render={<Link href={it.href} aria-current={active ? "page" : undefined} />}>
            {it.label}
          </Button>
        );
      })}
    </nav>
  );
}

// Menú en móvil: un botón abre un panel lateral con los enlaces y la sesión.
export function MobileMenu({ user }: { user: HeaderUser }) {
  const path = usePathname();
  const items = useItems(user);
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="icon" className="md:hidden" aria-label="Menú" />}>
        <Menu />
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>Menú</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {items.map((it) => {
            const active = it.match(path);
            return (
              <SheetClose key={it.href} nativeButton={false} render={<Button variant={active ? "secondary" : "ghost"} className="justify-start" nativeButton={false} render={<Link href={it.href} aria-current={active ? "page" : undefined} />} />}>
                {it.label}
              </SheetClose>
            );
          })}
        </nav>
        <Separator />
        <div className="flex items-center gap-3 px-4">
          {user ? (
            <>
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">{user.initials}</AvatarFallback>
              </Avatar>
              <Badge variant={user.canUpload ? "default" : "secondary"}>{user.role}</Badge>
              <form action="/auth/signout" method="post" className="ml-auto">
                <Button variant="outline" size="sm" type="submit">
                  Salir
                </Button>
              </form>
            </>
          ) : (
            <SheetClose nativeButton={false} render={<Button className="w-full" nativeButton={false} render={<Link href="/login" />} />}>Entrar</SheetClose>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
