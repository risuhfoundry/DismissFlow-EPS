import Link from "next/link";
import { isGate, getSessionUser, type SessionUser } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { gateSignOut } from "./actions";

// Gate route group — enforces the role guard. The authenticated Supabase user is
// resolved to the application profile using the RLS-scoped server client.
// Authorization itself is enforced by RLS; this only materializes the role scope
// and blocks confirmed non-gate profiles at the layout boundary. Unauthenticated
// callers fall through to the client page, which shows a friendly sign-in note.
export default async function GateLayout({
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

  if (sessionUser && !isGate(sessionUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-warning-soft text-warning">
              <Icon name="shield" className="h-6 w-6" />
            </span>
            <h1 className="text-h3 text-foreground">Gate staff only</h1>
            <p className="text-sm text-muted-foreground">
              This area is for gate staff verifying dismissals. Please use the
              sign-in page for your role.
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

  // Best-effort display context for the shell: the gate's school name powers the
  // header pill. It is optional and never blocks rendering if the lookup fails.
  // The gate identity is the login_id; there is no name column on users.
  let userName = sessionUser?.loginId ?? "Gate";
  let schoolName: string | undefined;
  if (sessionUser) {
    try {
      const { data: me } = await supabase
        .from("users")
        .select("school_id")
        .eq("id", sessionUser.userId)
        .maybeSingle();
      if (me?.school_id) {
        const { data: sch } = await supabase
          .from("schools")
          .select("name")
          .eq("school_id", me.school_id)
          .maybeSingle();
        if (sch?.name) schoolName = sch.name;
      }
    } catch {
      // Optional context — ignore lookup failures.
    }
  }

  return (
    <AppLayout
      role="gate"
      user={{ name: userName, role: "gate" }}
      schoolName={schoolName}
      onSignOut={gateSignOut}
    >
      {children}
    </AppLayout>
  );
}
