import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Create Supabase client that can refresh the session cookie
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Always call getUser() — this refreshes the session cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect /dashboard — redirect to landing if not signed in
  if (pathname.startsWith("/dashboard") && !user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protect /admin — redirect to landing if not signed in
  // (role check is done in the admin layout server component)
  if (pathname.startsWith("/admin") && !user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect signed-in users away from the landing page
  if (pathname === "/" && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
};
