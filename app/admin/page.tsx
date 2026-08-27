"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { TopNav } from "@/components/ui/TopNav";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { label: "Overview", href: "/admin" },
  { label: "Roster", href: "/admin/roster" },
  { label: "Logs", href: "/admin/logs" }
];

type ClassRow = { class_id: string; class_name: string; section: string | null };
type StudentRow = {
  student_id: string;
  name: string;
  admission_no: string;
  class_id: string | null;
};
type RequestCount = { student_id: string; count: number };

export default function AdminOverviewPage() {
  const supabase = getSupabaseBrowserClient();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [todayCount, setTodayCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [authNote, setAuthNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) {
          setAuthNote("Sign in at /login/admin to access the admin portal.");
          setLoading(false);
          return;
        }
        const [{ data: cls }, { data: stu }] = await Promise.all([
          supabase
            .from("classes")
            .select("class_id, class_name, section")
            .order("class_name", { ascending: true }),
          supabase
            .from("students")
            .select("student_id, name, admission_no, class_id")
            .order("admission_no", { ascending: true })
        ]);
        if (cancelled) return;
        setClasses((cls ?? []) as ClassRow[]);
        setStudents((stu ?? []) as StudentRow[]);

        // Approximate "today" count: requests whose updated_at is today AND
        // are in a final state. The RLS policy for admin already permits this.
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { data: today } = await supabase
          .from("dismissal_requests")
          .select("request_id, status, updated_at")
          .in("status", ["DISMISSED", "REJECTED", "CANCELLED", "EXPIRED"])
          .gte("updated_at", startOfDay.toISOString());
        if (!cancelled) setTodayCount((today ?? []).length);
      } catch {
        if (!cancelled) setAuthNote("Could not load admin data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const studentsByClass: Record<string, StudentRow[]> = {};
  for (const s of students) {
    if (!s.class_id) continue;
    if (!studentsByClass[s.class_id]) studentsByClass[s.class_id] = [];
    studentsByClass[s.class_id].push(s);
  }

  return (
    <>
      <TopNav
        links={NAV_LINKS}
        trailing={
          <Link
            href="/admin/logs"
            className="font-mono uppercase tracking-widest text-mono-xs text-muted hover:text-bone transition-colors"
          >
            View Logs →
          </Link>
        }
      />

      <main className="pt-24 pb-16 section-shell">
        <span className="eyebrow">
          <i />
          04 / ADMIN OVERVIEW
        </span>
        <h2 className="font-display text-display-md uppercase text-bone mt-4">
          Operations
        </h2>
        <p className="text-muted mt-3 max-w-2xl">
          Class roster, dismissal counts, and the immutable audit trail. The
          admin role has broad RLS access; mutations to operational state must
          still go through the Edge Functions.
        </p>

        {authNote && (
          <div className="mt-8">
            <Panel withTopBar topBar={<span>00 / ACCESS</span>}>
              <div className="p-7 flex flex-col gap-5">
                <p className="font-mono text-mono-sm uppercase tracking-widest text-muted">
                  {authNote}
                </p>
                <Link
                  href="/login/admin"
                  className="h-12 px-5 inline-flex items-center gap-3 bg-accent text-white font-mono uppercase tracking-widest text-mono-sm font-semibold shadow-accent-glow w-fit"
                >
                  <Icon name="arrow.right" className="h-4 w-4" strokeWidth={2} />
                  Sign In
                </Link>
              </div>
            </Panel>
          </div>
        )}

        {!authNote && !loading && (
          <div className="mt-10 grid gap-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line"
            >
              <Stat label="STUDENTS" value={String(students.length)} />
              <Stat label="CLASSES" value={String(classes.length)} />
              <Stat label="DISMISSALS TODAY" value={String(todayCount)} />
            </motion.div>

            {classes.map((c) => {
              const list = studentsByClass[c.class_id] ?? [];
              return (
                <Panel
                  key={c.class_id}
                  withTopBar
                  topBar={
                    <>
                      <span>{c.class_name.toUpperCase()}</span>
                      <span className="text-muted">
                        {list.length} STUDENT{list.length === 1 ? "" : "S"}
                      </span>
                    </>
                  }
                >
                  {list.length === 0 ? (
                    <div className="p-7 text-muted">No students in this class yet.</div>
                  ) : (
                    <ul className="divide-y divide-line">
                      {list.map((s) => (
                        <li
                          key={s.student_id}
                          className="p-5 flex items-center justify-between"
                        >
                          <div className="flex flex-col gap-1">
                            <p className="font-display text-xl uppercase text-bone leading-none">
                              {s.name}
                            </p>
                            <p className="font-mono text-mono-xs uppercase tracking-widest text-muted">
                              ADM {s.admission_no}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel p-6">
      <MonoLabel size="sm" tone="muted">
        {label}
      </MonoLabel>
      <p className="font-display text-display-md uppercase text-bone mt-2 leading-none">
        {value}
      </p>
    </div>
  );
}
