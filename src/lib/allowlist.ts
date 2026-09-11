// Quién puede subir vídeos. Se lee de ALLOWED_EMAILS (coma-separado).
// Cualquier usuario logueado puede VER; solo estos pueden SUBIR.
const allowed = new Set(
  (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export function isProfe(email: string | null | undefined): boolean {
  return !!email && allowed.has(email.toLowerCase());
}
