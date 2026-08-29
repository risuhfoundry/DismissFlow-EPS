"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { TopNav } from "@/components/ui/TopNav";
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
        <span className="eyebrow">
          <i />
          04 / CLASSES
        </span>
        <h2 className="font-display text-display-md uppercase text-bone mt-4">
          {classes.length} {classes.length === 1 ? "Class" : "Classes"}
        </h2>
        <p className="text-muted mt-3 max-w-2xl">
          Classes are read from the database — nothing is hardcoded. Each card
          shows the assigned teacher and the live student count.
        </p>

        {authNote && (
          <div className="mt-8">
            <Panel withTopBar topBar={<span>00 / ACCESS</span>}>
              <div className="p-7 font-mono text-mono-sm uppercase tracking-widest text-muted">
                {authNote}
              </div>
            </Panel>
          </div>
        )}

        {!authNote && (
          <div className="mt-10 grid gap-6">
            {loading ? (
              <Panel>
                <div className="p-10 flex items-center justify-center">
                  <Icon name="timer" className="h-5 w-5 text-muted" />
                </div>
              </Panel>
            ) : classes.length === 0 ? (
              <Panel>
                <div className="p-7 text-muted">No classes found.</div>
              </Panel>
            ) : (
              classes.map((c) => (
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
                      <span className="font-display text-3xl uppercase text-bone leading-none">
                        {studentCounts[c.class_id] ?? 0}
                      </span>
                    </Field>
                  </div>
                </Panel>
              ))
            )}
          </div>
        )}
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <MonoLabel size="xs" tone="muted">
        {label}
      </MonoLabel>
      <div>{children}</div>
    </div>
  );
}
