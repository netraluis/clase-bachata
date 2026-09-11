import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin } from "@/lib/request-origin";

// Google → Supabase → aquí con ?code=... (flujo PKCE).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const origin = requestOrigin(request.headers);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("exchangeCodeForSession:", error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
