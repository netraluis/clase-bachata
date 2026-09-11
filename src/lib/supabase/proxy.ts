import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requestOrigin } from "@/lib/request-origin";

// Refresca el token de sesión en cada request. La vista de alumnos es
// pública: solo exigen sesión subir, administrar y la API.
// Se llama desde src/proxy.ts.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: nada de código entre createServerClient y getClaims.
  // getClaims valida el JWT y refresca la sesión si hace falta.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const { pathname } = request.nextUrl;
  const isProtected =
    pathname.startsWith("/subir") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api");

  if (!user && isProtected) {
    // Las rutas de API responden 401 en JSON, no con una redirección HTML.
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "No has iniciado sesión" }, { status: 401 });
    }
    return NextResponse.redirect(`${requestOrigin(request.headers)}/login`);
  }

  return supabaseResponse;
}
