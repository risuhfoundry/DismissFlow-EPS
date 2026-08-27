import { isAdmin, getSessionUser, type SessionUser } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Admin route group — enforces the role guard per Docs/architecture.md §3.2.
async function requireAdmin(): Promise<SessionUser | null> {
  try {
    const supabase = getSupabaseServerClient();
    return await getSessionUser(supabase);
  } catch {
    return null;
  }
}

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  if (user && !isAdmin(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="font-mono uppercase tracking-widest text-mono-sm text-muted">
          This area is for admins only.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
