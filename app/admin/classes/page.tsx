"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { Field } from "@/components/ui/Field";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { TopNav } from "@/components/ui/TopNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccessNote } from "@/components/ui/AccessNote";
import { LoadingState, EmptyState } from "@/components/ui/StateBlock";
import { useRealtimeStatus } from "@/lib/realtime/subs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { label: "Overview", href: "/admin" },
  { label: "Roster", href: "/admin/roster" },
  { label: "Classes", href: "/admin/classes" },
  { label: "Users", href: "/admin/users" },
  { label: "Monitor", href: "/admin/monitor" },
  { label: "Logs", href: "/admin/logs" }
];

type ClassRow = {
  class_id: string;
  class_name: string;
  section: string | null;
  teacher_id: string | null;
};

export default function AdminClassesPage() {
  const supabase = getSupabaseBrowserClient();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [teacherLogin, setTeacherLogin] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const status$ = useRealtimeStatus(supabase, "classes");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) {
          setAuthNote("Sign in at /login/admin to view classes.");
          setLoading(false);
          return;
        }
        const [{ data: cls }, { data: stus }, { data: teachers }] = await Promise.all([
          supabase
            .from("classes")
            .select("class_id, class_name, section, teacher_id")
            .order("class_name", { ascending: true }),
          supabase.from("students").select("student_id, class_id"),
          supabase
            .from("users")
            .select("user_id, login_id, role")
            .eq("role", "teacher")
        ]);
        if (cancelled) return;
        const rows = (cls ?? []) as ClassRow[];
        setClasses(rows);

        // Student count per class — derived from real rows, no hardcoding.
        const counts: Record<string, number> = {};
        for (const c of rows) counts[c.class_id] = 0;
        for (const s of (stus ?? []) as { class_id: string | null }[]) {
          if (s.class_id && counts[s.class_id] !== undefined) counts[s.class_id] += 1;
        }
        setStudentCounts(counts);

        // Map teacher_id -> login_id (no PII; login_id is the role identifier).
        const tmap: Record<string, string> = {};
        for (const t of (teachers ?? []) as { user_id: string; login_id: string | null }[]) {
          if (t.login_id) tmap[t.user_id] = t.login_id;
        }
        setTeacherLogin(tmap);
      } catch {
        if (!cancelled) setAuthNote("Could not load classes.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <>
      <TopNav links={NAV_LINKS} trailing={<StatusIndicator status={status$} />} />

      <main className="pt-24 pb-16 section-shell">
        <PageHeader
          eyebrow="04 / CLASSES"
          title={classes.length ? `${classes.length} Classes` : "Classes"}
          description="Classes are read from the database — nothing is hardcoded. Each card shows the assigned teacher and the live student count."
        />

        {authNote && (
          <div className="mt-8">
            <AccessNote message={authNote} signInHref="/login/admin" signInLabel="Sign In" />
          </div>
        )}

        {!authNote && loading && (
          <div className="mt-10">
            <LoadingState message="Loading classes…" />
          </div>
        )}

        {!authNote && !loading && classes.length === 0 && (
          <div className="mt-10">
            <EmptyState message="No classes found." icon="user" />
          </div>
        )}

        {!authNote && !loading && classes.length > 0 && (
          <div className="mt-10 grid gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-px bg-line">
              <Stat label="CLASSES" value={classes.length} />
              <Stat
                label="TOTAL STUDENTS"
                value={Object.values(studentCounts).reduce((a, b) => a + b, 0)}
              />
            </div>
            {classes.map((c) => (
              <Panel
                key={c.class_id}
                withTopBar
                topBar={
                  <>
                    <span>{c.class_name.toUpperCase()}</span>
                    <span className="text-muted">
                      {c.section ? c.section.toUpperCase() : "NO SECTION"}
                    </span>
                  </>
                }
              >
                <div className="p-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field label="ASSIGNED TEACHER">
                    {c.teacher_id ? (
                      <span className="font-mono uppercase tracking-widest text-bone">
                        {teacherLogin[c.teacher_id] ?? "—"}
                      </span>
                    ) : (
                      <MonoLabel size="sm" tone="muted">
                        UNASSIGNED
                      </MonoLabel>
                    )}
                  </Field>
                  <Field label="STUDENTS">
                    <span className="font-display text-4xl uppercase text-bone leading-none">
                      {studentCounts[c.class_id] ?? 0}
                    </span>
                  </Field>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
