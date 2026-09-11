import { createClient } from "@/lib/supabase/server";
import { isProfe } from "@/lib/allowlist";

export type SessionUser = {
  id: string;
  email: string;
  profe: boolean;
};

// Devuelve el usuario de la sesión o null. Valida el JWT localmente
// (sin llamada de red) vía getClaims.
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const email = (claims.email as string | undefined) ?? "";
  return { id: claims.sub, email, profe: isProfe(email) };
}
