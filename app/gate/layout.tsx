import { isGate, getSessionUser, type SessionUser } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Gate route group — enforces the role guard per Docs/architecture.md §3.2.
// Identical shape to the parent layout: materializes the role scope; the
// non-gate case renders a friendly access note rather than crashing the route.
async function requireGate(): Promise<SessionUser | null> {
  try {
    const supabase = getSupabaseServerClient();
    return await getSessionUser(supabase);
  } catch {
    return null;
  }
}

export default async function GateLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await requireGate();
  if (user && !isGate(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="font-mono uppercase tracking-widest text-mono-sm text-muted">
          This area is for gate staff only.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
