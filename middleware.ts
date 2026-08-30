import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Session-refresh middleware. Establishes and maintains the Supabase Auth
// session cookie so Server Components and the browser client share one
// RLS-scoped session. It does NOT perform authorization (that is RLS + Edge
// Function responsibility). No service-role key is used here.
type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function middleware(request: NextRequest) {
  // Phase 18.1: the /foundation route is a development/component showcase with
  // synthetic UI demo data. It is dev-only — block it in production at the
  // server/edge layer (before any rendering or bundle is served) with a safe
  // 404 so production users never receive showcase content.
  if (
    (request.nextUrl.pathname === "/foundation" ||
      request.nextUrl.pathname.startsWith("/foundation/")) &&
    process.env.NODE_ENV === "production"
  ) {
    return new NextResponse("Not Found", { status: 404 });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  // Refresh the session (no-op if not signed in).
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
