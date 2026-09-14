"use client";

import Link from "next/link";
import { Fragment, createContext, useContext, useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

// Migas contextuales de la cabecera (patrón "breadcrumb con dropdown" de shadcn).
// Una página puede fijarlas (el vídeo: Curso / Clase / fecha); al salir vuelve
// el nombre de la escuela. Cada miga puede llevar un desplegable con las
// alternativas y la actual marcada.
export type CrumbOption = { label: string; hint?: string; href: string; current: boolean };
export type Crumb = { label: string; href?: string; options?: CrumbOption[] };

const Ctx = createContext<{ crumbs: Crumb[] | null; setCrumbs: (c: Crumb[] | null) => void }>({
  crumbs: null,
  setCrumbs: () => {},
});

export function HeaderTitleProvider({ children }: { children: React.ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[] | null>(null);
  return <Ctx.Provider value={{ crumbs, setCrumbs }}>{children}</Ctx.Provider>;
}

export function SetHeaderCrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const { setCrumbs } = useContext(Ctx);
  const key = JSON.stringify(crumbs);
  useEffect(() => {
    setCrumbs(JSON.parse(key));
    return () => setCrumbs(null);
  }, [key, setCrumbs]);
  return null;
}

// Si no cabe todo en una línea, se recorta con "…" primero el curso (miga 0)
// y después la clase (miga 1); la fecha nunca se recorta.
const SHRINK = ["min-w-[4ch] shrink-[4]", "min-w-[4ch] shrink-[1]", "shrink-0"];

export function HeaderBrandText({ fallback }: { fallback: string }) {
  const { crumbs } = useContext(Ctx);
  if (!crumbs) return <span className="truncate">{fallback}</span>;
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap gap-1.5 font-heading text-base font-bold text-foreground">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          const cls = SHRINK[i] ?? "shrink";
          return (
            <Fragment key={i}>
              {i > 0 && <BreadcrumbSeparator className="shrink-0">/</BreadcrumbSeparator>}
              <BreadcrumbItem className={`min-w-0 ${cls}`}>
                {c.options && c.options.length > 0 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex min-w-0 items-center gap-1 font-bold outline-none hover:text-foreground">
                      <span className="truncate">{c.label}</span>
                      <ChevronDown className="size-3.5 shrink-0" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
                      {c.options.map((o) => (
                        <DropdownMenuItem key={o.href + o.label} render={<Link href={o.href} />} className={o.current ? "font-medium" : ""}>
                          <span className="flex size-4 shrink-0 items-center justify-center">{o.current && <Check className="size-4" />}</span>
                          <span className="flex-1 truncate">{o.label}</span>
                          {o.hint && <span className="ml-3 text-xs text-muted-foreground tabular-nums">{o.hint}</span>}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : last || !c.href ? (
                  <BreadcrumbPage className="truncate font-bold">{c.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={c.href} />} className="truncate font-bold">
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
