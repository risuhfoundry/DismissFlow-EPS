import Link from "next/link";
import { isParent, getSessionUser, type SessionUser } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { parentSignOut } from "./actions";

// Parent route group — enforces the role guard per Docs/architecture.md §3.2.
// The authenticated Supabase user is resolved to the application profile using the
// RLS-scoped server client. Authorization is enforced by RLS; this only
// materializes the role scope and blocks non-parents at the layout boundary.
//
// Unauthenticated callers are passed through to the client page, which shows a
// friendly sign-in note. A confirmed non-parent profile is blocked here.
export default async function ParentLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = getSupabaseServerClient();

  let sessionUser: SessionUser | null = null;
  try {
    sessionUser = await getSessionUser(supabase);
  } catch {
    // Supabase not configured or the lookup failed — fall through to the client
    // page, which shows a friendly sign-in note rather than crashing the route.
  }

  if (sessionUser && !isParent(sessionUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive-soft text-destructive">
              <Icon name="shield" className="h-6 w-6" />
            </span>
            <h1 className="text-h3 text-foreground">Parents only</h1>
            <p className="text-sm text-muted-foreground">
              This area is for parents. Please use the sign-in page for your role.
            </p>
            <Link
              href="/"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Back to home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Best-effort display context for the shell: the linked child's name powers the
  // account menu, and the school name (if reachable under RLS) powers the header
  // pill. Both are optional and never block rendering if the lookup fails.
  let userName = "Parent";
  let schoolName: string | undefined;
  if (sessionUser?.linkedStudentId) {
    try {
      const { data: stu } = await supabase
        .from("students")
        .select("name, school_id")
        .eq("student_id", sessionUser.linkedStudentId)
        .maybeSingle();
      if (stu?.name) userName = stu.name;
      if (stu?.school_id) {
        const { data: sch } = await supabase
          .from("schools")
          .select("name")
          .eq("school_id", stu.school_id)
          .maybeSingle();
        if (sch?.name) schoolName = sch.name;
      }
    } catch {
      // Optional context — ignore lookup failures.
    }
  }

  return (
    <AppLayout
      role="parent"
      user={{ name: userName, role: "parent" }}
      schoolName={schoolName}
      onSignOut={parentSignOut}
    >
      {children}
    </AppLayout>
  );
}
