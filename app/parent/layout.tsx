import { isParent, type SessionUser } from "@/lib/auth/session";

// Parent route group — enforces the role guard per Docs/architecture.md §3.2.
// The real implementation reads the session from a Supabase cookie; here we
// stub a check so the structure is in place.
async function requireParent(): Promise<SessionUser | null> {
  // TODO(impl): replace with Supabase server client + RLS-scoped lookup.
  return null;
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
