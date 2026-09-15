"use client";

import Link from "next/link";
import { Fragment, createContext, useContext, useEffect, useState } from "react";
import { Check, ChevronDown, List } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

// Migas contextuales de la cabecera (patrón "breadcrumb con dropdown" de shadcn).
// Cada página las fija (el vídeo: Curso / Clase / fecha); mientras una página
// carga no hay migas y se ve un esqueleto. Cada miga puede llevar un desplegable con las
// alternativas y la actual marcada, encabezado por `title` ("Cursos", "Clases")
// y cerrado por enlaces `links` a las listas completas ("Todos los cursos").
export type CrumbOption = { label: string; hint?: string; href: string; current: boolean };
export type CrumbLink = { label: string; href: string; current?: boolean }; // current cuando estamos en esa lista
export type Crumb = { label: string; href?: string; title?: string; options?: CrumbOption[]; links?: CrumbLink[] };

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

// En pantallas estrechas (< sm) solo se ven las dos últimas migas; las
// anteriores se pliegan en un "…" con desplegable (patrón "collapsed" de shadcn).
const VISIBLE_ON_MOBILE = 2;

// Si no cabe todo en una línea, se recorta con "…" primero el curso (miga 0)
// y después la clase (miga 1); la última miga nunca se recorta.
const SHRINK = ["min-w-[4ch] shrink-[4]", "min-w-[4ch] shrink-[1]"];

// El menú mide lo que su contenido (no lo que el trigger, que puede ir encogido).
const MENU_CLASS = "w-auto max-w-(--available-width) max-h-80 overflow-y-auto";

// Contenido del menú de una miga: título, alternativas y enlace a la lista completa.
function CrumbMenu({ crumb, label }: { crumb: Crumb; label?: string }) {
  return (
    <>
      <DropdownMenuGroup>
        {label && <DropdownMenuLabel>{label}</DropdownMenuLabel>}
        {(crumb.options ?? []).map((o) => (
          <DropdownMenuItem key={o.href + o.label} render={<Link href={o.href} />} className={o.current ? "font-medium" : ""}>
            <span className="flex size-4 shrink-0 items-center justify-center">{o.current && <Check className="size-4" />}</span>
            <span className="flex-1 truncate">{o.label}</span>
            {o.hint && <span className="ml-3 text-xs text-muted-foreground tabular-nums">{o.hint}</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
      {crumb.links && crumb.links.length > 0 && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {crumb.links.map((l) => (
              <DropdownMenuItem key={l.href} render={<Link href={l.href} />} className={l.current ? "font-medium" : ""}>
                <span className="flex size-4 shrink-0 items-center justify-center">{l.current ? <Check className="size-4" /> : <List className="size-4" />}</span>
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </>
      )}
    </>
  );
}

// Miga con desplegable (curso, clase) o enlace/texto plano.
function CrumbContent({ crumb, last }: { crumb: Crumb; last: boolean }) {
  if (crumb.options && crumb.options.length > 0) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="flex min-w-0 items-center gap-1 font-bold outline-none hover:text-foreground">
          <span className="truncate">{crumb.label}</span>
          <ChevronDown className="size-3.5 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={MENU_CLASS}>
          <CrumbMenu crumb={crumb} label={crumb.title} />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  if (last || !crumb.href) return <BreadcrumbPage className="truncate font-bold">{crumb.label}</BreadcrumbPage>;
  return (
    <BreadcrumbLink render={<Link href={crumb.href} />} className="truncate font-bold">
      {crumb.label}
    </BreadcrumbLink>
  );
}

// "…" que reúne las migas plegadas en móvil: las alternativas de cada una
// (con la actual marcada) o, si no tiene, un enlace a la propia miga.
function CollapsedCrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={crumbs.map((c) => c.label).join(" / ")} className="flex items-center outline-none hover:text-foreground">
        <BreadcrumbEllipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={MENU_CLASS}>
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <DropdownMenuSeparator />}
            {c.options && c.options.length > 0 ? (
              <CrumbMenu crumb={c} label={c.title ?? (crumbs.length > 1 ? c.label : undefined)} />
            ) : c.href ? (
              <DropdownMenuItem render={<Link href={c.href} />}>{c.label}</DropdownMenuItem>
            ) : (
              <DropdownMenuGroup>
                <DropdownMenuLabel>{c.label}</DropdownMenuLabel>
              </DropdownMenuGroup>
            )}
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function HeaderCrumbs() {
  const { crumbs } = useContext(Ctx);
  if (!crumbs) return <Skeleton className="h-5 w-32" aria-busy="true" aria-label="Cargando" />;
  const collapsed = Math.max(0, crumbs.length - VISIBLE_ON_MOBILE);
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap gap-1 font-heading text-sm font-bold text-foreground sm:gap-1.5 sm:text-base">
        {collapsed > 0 && (
          <>
            <BreadcrumbItem className="shrink-0 sm:hidden">
              <CollapsedCrumbs crumbs={crumbs.slice(0, collapsed)} />
            </BreadcrumbItem>
            <BreadcrumbSeparator className="shrink-0 sm:hidden">/</BreadcrumbSeparator>
          </>
        )}
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          const mobile = i < collapsed ? "hidden sm:inline-flex" : "";
          return (
            <Fragment key={i}>
              {i > 0 && <BreadcrumbSeparator className={`shrink-0 ${i - 1 < collapsed ? "hidden sm:block" : ""}`}>/</BreadcrumbSeparator>}
              <BreadcrumbItem className={`min-w-0 ${last ? "shrink-0" : (SHRINK[i] ?? "shrink")} ${mobile}`}>
                <CrumbContent crumb={c} last={last} />
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
