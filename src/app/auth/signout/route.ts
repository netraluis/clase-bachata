import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin } from "@/lib/request-origin";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${requestOrigin(request.headers)}/login`, 303);
}
