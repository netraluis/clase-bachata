"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";

export type HeaderUser = { initials: string; role: string; canUpload: boolean; isAdmin: boolean } | null;

// Rol de la sesión. Para el admin es el acceso a la administración (/admin),
// marcado cuando estamos en ella; para el resto, una etiqueta.
export function RoleLink({ user, inSheet = false }: { user: NonNullable<HeaderUser>; inSheet?: boolean }) {
  const path = usePathname();
  if (!user.isAdmin) return <Badge variant={user.canUpload ? "default" : "secondary"}>{user.role}</Badge>;
  const active = path.startsWith("/admin");
  const button = <Button variant={active ? "secondary" : "ghost"} size="sm" nativeButton={false} render={<Link href="/admin" aria-current={active ? "page" : undefined} />} />;
  if (inSheet) return <SheetClose nativeButton={false} render={button}>{user.role}</SheetClose>;
  return <Button variant={active ? "secondary" : "ghost"} size="sm" nativeButton={false} render={<Link href="/admin" aria-current={active ? "page" : undefined} />}>{user.role}</Button>;
}

export function SignOut() {
  return (
    <form action="/auth/signout" method="post">
      <Button variant="ghost" size="sm" type="submit">
        Cerrar sesión
      </Button>
    </form>
  );
}

// Menú en móvil: un botón abre un panel lateral con la sesión.
export function MobileMenu({ user }: { user: HeaderUser }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="icon" className="md:hidden" aria-label="Menú" />}>
        <Menu />
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>Menú</SheetTitle>
        </SheetHeader>
        <div className="flex items-center gap-3 px-4">
          {user ? (
            <>
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">{user.initials}</AvatarFallback>
              </Avatar>
              <RoleLink user={user} inSheet />
              <div className="ml-auto">
                <SignOut />
              </div>
            </>
          ) : (
            <SheetClose nativeButton={false} render={<Button className="w-full" nativeButton={false} render={<Link href="/login" />} />}>Entrar</SheetClose>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
