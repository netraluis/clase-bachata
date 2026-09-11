import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "profe" | "alumno";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  canUpload: boolean; // admin o profe
  isAdmin: boolean;
};

// Usuario de la sesión con su rol leído de `profiles` (RLS: solo ve el suyo).
// Devuelve null si no hay sesión.
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, display_name, role")
    .eq("id", claims.sub)
    .maybeSingle();

  const role = (profile?.role as Role | undefined) ?? "alumno";
  return {
    id: claims.sub,
    email: profile?.email ?? ((claims.email as string | undefined) ?? ""),
    name: profile?.display_name ?? null,
    role,
    canUpload: role === "admin" || role === "profe",
    isAdmin: role === "admin",
  };
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "admin",
  profe: "profe",
  alumno: "alumno",
};
