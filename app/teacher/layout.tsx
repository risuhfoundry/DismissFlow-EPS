import Link from "next/link";
import {
  isTeacher,
  getSessionUser,
  type SessionUser
} from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { teacherSignOut } from "./actions";

// Teacher route group — enforces the role guard per Docs/architecture.md §3.2.
// Mirrors the parent layout: the authenticated Supabase user is resolved to the
// application profile using the RLS-scoped server client. Authorization is
// enforced by RLS; this only materializes the role scope and blocks non-teachers
// at the layout boundary.
//
// Unauthenticated callers are passed through to the client page, which shows a
// friendly sign-in note. A confirmed non-teacher profile is blocked here.
export default async function TeacherLayout({
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

  if (sessionUser && !isTeacher(sessionUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive-soft text-destructive">
              <Icon name="shield" className="h-6 w-6" />
            </span>
            <h1 className="text-h3 text-foreground">Teachers only</h1>
            <p className="text-sm text-muted-foreground">
              This area is for teachers. Please use the sign-in page for your
              role.
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

  // Best-effort display context for the shell. A teacher has no separate name
  // column, so the staff ID (e.g. TCH-1001) is the account identity surfaced in
  // the header. The school name is resolved from the teacher's assigned class
  // and is optional — rendering is never blocked if the lookup fails.
  let userName = "Teacher";
  let schoolName: string | undefined;
  if (sessionUser) {
    if (sessionUser.loginId) userName = sessionUser.loginId;
    if (sessionUser.assignedClassId) {
      try {
        const { data: cls } = await supabase
          .from("classes")
          .select("school_id")
          .eq("class_id", sessionUser.assignedClassId)
          .maybeSingle();
        if (cls?.school_id) {
          const { data: sch } = await supabase
            .from("schools")
            .select("name")
            .eq("school_id", cls.school_id)
            .maybeSingle();
          if (sch?.name) schoolName = sch.name;
        }
      } catch {
        // Optional context — ignore lookup failures.
      }
    }
  }

  return (
    <AppLayout
      role="teacher"
      user={{ name: userName, role: "teacher" }}
      schoolName={schoolName}
      onSignOut={teacherSignOut}
    >
      {children}
    </AppLayout>
  );
}
