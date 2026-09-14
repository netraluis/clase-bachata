"use client";

import Link from "next/link";
import { Fragment, createContext, useContext, useEffect, useState } from "react";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

// Migas contextuales de la cabecera. Una página puede fijarlas (el vídeo:
// Curso / Clase / fecha) y al salir vuelve el nombre de la escuela.
export type Crumb = { label: string; href?: string };

const Ctx = createContext<{ crumbs: Crumb[] | null; setCrumbs: (c: Crumb[] | null) => void }>({
  crumbs: null,
  setCrumbs: () => {},
});

export function HeaderTitleProvider({ children }: { children: React.ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[] | null>(null);
  return <Ctx.Provider value={{ crumbs, setCrumbs }}>{children}</Ctx.Provider>;
}

// Se renderiza dentro de la página que quiere migas propias en la cabecera.
export function SetHeaderCrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const { setCrumbs } = useContext(Ctx);
  const key = JSON.stringify(crumbs);
  useEffect(() => {
    setCrumbs(JSON.parse(key));
    return () => setCrumbs(null);
  }, [key, setCrumbs]);
  return null;
}

// Marca de la cabecera: migas si las hay, si no el nombre de la escuela.
// Las migas pueden ocupar dos líneas en móvil para que se lean los títulos enteros.
export function HeaderBrandText({ fallback }: { fallback: string }) {
  const { crumbs } = useContext(Ctx);
  if (!crumbs) return <span className="truncate">{fallback}</span>;
  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-wrap gap-x-1.5 gap-y-0 text-base font-heading font-bold text-foreground">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <Fragment key={i}>
              {i > 0 && <BreadcrumbSeparator>/</BreadcrumbSeparator>}
              <BreadcrumbItem>
                {last || !c.href ? (
                  <BreadcrumbPage className="font-bold">{c.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={c.href} />} className="font-bold">
                    {c.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
