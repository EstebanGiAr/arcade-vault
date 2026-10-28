import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

  // No eliminar: refresca el token de sesión en cada request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/cuenta")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?next=/cuenta";
    return NextResponse.redirect(url);
  }

  if (!user && pathname.startsWith("/nueva-contrasena")) {
    const url = request.nextUrl.clone();
    url.pathname = "/recuperar";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
