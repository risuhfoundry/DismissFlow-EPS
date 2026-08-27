import { isTeacher, getSessionUser, type SessionUser } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Teacher route group — enforces the role guard per Docs/architecture.md §3.2.
// Identical shape to the parent and gate layouts.
async function requireTeacher(): Promise<SessionUser | null> {
  try {
    const supabase = getSupabaseServerClient();
    return await getSessionUser(supabase);
  } catch {
    return null;
  }
}

export default async function TeacherLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await requireTeacher();
  if (user && !isTeacher(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="font-mono uppercase tracking-widest text-mono-sm text-muted">
          This area is for teachers only.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
