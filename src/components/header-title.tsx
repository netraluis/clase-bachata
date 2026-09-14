"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Título contextual de la cabecera. Una página puede fijarlo (por ejemplo el
// vídeo: "Curso / Clase dd-mm-aa") y al salir vuelve al nombre de la escuela.
const Ctx = createContext<{ title: string | null; setTitle: (t: string | null) => void }>({
  title: null,
  setTitle: () => {},
});

export function HeaderTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  return <Ctx.Provider value={{ title, setTitle }}>{children}</Ctx.Provider>;
}

export function useHeaderTitle() {
  return useContext(Ctx).title;
}

// Se renderiza dentro de la página que quiere un título propio en la cabecera.
export function SetHeaderTitle({ title }: { title: string }) {
  const { setTitle } = useContext(Ctx);
  useEffect(() => {
    setTitle(title);
    return () => setTitle(null);
  }, [title, setTitle]);
  return null;
}

// Marca de la cabecera: el título contextual si lo hay, si no el de la escuela.
export function HeaderBrandText({ fallback }: { fallback: string }) {
  const title = useHeaderTitle();
  return <span className="truncate">{title ?? fallback}</span>;
}
