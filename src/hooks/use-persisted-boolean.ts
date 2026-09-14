"use client";

import { useCallback, useSyncExternalStore } from "react";

// Booleano guardado en localStorage, seguro para hidratación
// (en el servidor y en el primer render del cliente vale `fallback`).
export function usePersistedBoolean(key: string, fallback = false): [boolean, (v: boolean) => void] {
  const subscribe = useCallback(
    (cb: () => void) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) cb();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(`persisted:${key}`, cb);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(`persisted:${key}`, cb);
      };
    },
    [key],
  );
  const get = useCallback(() => {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : v === "1";
    } catch {
      return fallback;
    }
  }, [key, fallback]);
  const value = useSyncExternalStore(subscribe, get, () => fallback);
  const set = useCallback(
    (v: boolean) => {
      try {
        localStorage.setItem(key, v ? "1" : "0");
      } catch {}
      window.dispatchEvent(new Event(`persisted:${key}`));
    },
    [key],
  );
  return [value, set];
}
