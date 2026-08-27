import { isParent, getSessionUser, type SessionUser } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Parent route group — enforces the role guard per Docs/architecture.md §3.2.
// Resolves the authenticated Supabase user to the application profile using the
// RLS-scoped server client. Authorization is enforced by RLS; this only
// materializes the role scope and blocks non-parents at the layout boundary.
//
// Unauthenticated callers are passed through to the client page, which shows a
// friendly sign-in note (there is no dedicated sign-in route yet). A confirmed
// non-parent profile is blocked here.
async function requireParent(): Promise<SessionUser | null> {
  try {
    const supabase = getSupabaseServerClient();
    return await getSessionUser(supabase);
  } catch {
    // Supabase not configured (missing env) or session lookup failed — fall
    // through to the client page, which shows a friendly sign-in note rather
    // than crashing the route.
    return null;
  }
}

export default async function ParentLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await requireParent();
  if (user && !isParent(user)) {
    // Unauthorized role — in real impl, redirect via Next.js `redirect()`.
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-ios-body text-ink-muted">
          This area is for parents only.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
