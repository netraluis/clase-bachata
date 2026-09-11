"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

type Item = { href: string; label: string; match: (path: string) => boolean };

// Menú principal. Marca la sección actual según la ruta.
export function HeaderNav({ canUpload, isAdmin }: { canUpload: boolean; isAdmin: boolean }) {
  const path = usePathname();
  const items: Item[] = [
    { href: "/events", label: "Clases", match: (p) => p === "/" || p.startsWith("/events") || p.startsWith("/v/") },
    { href: "/lessons", label: "Cursos", match: (p) => p.startsWith("/lessons") },
    ...(canUpload ? [{ href: "/subir", label: "Subir", match: (p: string) => p.startsWith("/subir") }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Personas", match: (p: string) => p.startsWith("/admin") }] : []),
  ];

  return (
    <nav className="flex items-center gap-1">
      {items.map((it) => {
        const active = it.match(path);
        return (
          <Button
            key={it.href}
            variant={active ? "secondary" : "ghost"}
            size="sm"
            nativeButton={false}
            render={<Link href={it.href} aria-current={active ? "page" : undefined} />}
          >
            {it.label}
          </Button>
        );
      })}
    </nav>
  );
}
