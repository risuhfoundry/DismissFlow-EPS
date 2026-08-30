"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { TopNav } from "@/components/ui/TopNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccessNote } from "@/components/ui/AccessNote";
import { LoadingState, EmptyState } from "@/components/ui/StateBlock";
import { Table, Th, Td } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth/session";

const NAV_LINKS = [
  { label: "Overview", href: "/admin" },
  { label: "Roster", href: "/admin/roster" },
  { label: "Classes", href: "/admin/classes" },
  { label: "Users", href: "/admin/users" },
  { label: "Monitor", href: "/admin/monitor" },
  { label: "Logs", href: "/admin/logs" }
];

type ClassRow = { class_id: string; class_name: string; section: string | null };
type StudentRow = {
  student_id: string;
  name: string;
  admission_no: string;
  gender: string | null;
  dob: string | null;
  class_id: string | null;
};

export default function AdminRosterPage() {
  const supabase = getSupabaseBrowserClient();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  // student_id -> has at least one linked guardian (from student_guardians).
  const [guardianLinked, setGuardianLinked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessionUser = await getSessionUser(supabase);
        if (!sessionUser || sessionUser.role !== "admin") {
          setAuthNote("Sign in as an admin to view the roster.");
          setLoading(false);
          return;
        }
        const [{ data: cls }, { data: stu }, { data: sg }] = await Promise.all([
          supabase
            .from("classes")
            .select("class_id, class_name, section")
            .order("class_name", { ascending: true }),
          supabase
            .from("students")
            .select("student_id, name, admission_no, gender, dob, class_id")
            .order("admission_no", { ascending: true }),
          // Only the linkage flag is needed — guardian PII is not pulled here.
          supabase.from("student_guardians").select("student_id")
        ]);
        if (cancelled) return;
        setClasses((cls ?? []) as ClassRow[]);
        setStudents((stu ?? []) as StudentRow[]);
        const linked: Record<string, boolean> = {};
        for (const row of (sg ?? []) as { student_id: string }[]) {
          linked[row.student_id] = true;
        }
        setGuardianLinked(linked);
      } catch {
        if (!cancelled) setAuthNote("Could not load the roster.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const filtered = students.filter((s) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return (
      s.name.toLowerCase().includes(needle) ||
      s.admission_no.toLowerCase().includes(needle)
    );
  });

  return (
    <>
      <TopNav
        links={NAV_LINKS}
        trailing={
          <Link
            href="/admin"
            className="font-mono uppercase tracking-widest text-mono-xs text-muted hover:text-bone transition-colors"
          >
            ← Overview
          </Link>
        }
      />

      <main className="pt-24 pb-16 section-shell">
        <PageHeader
          eyebrow="04 / ROSTER"
          title={`${students.length} Students`}
          description="The full seeded roster. Admission numbers retain their leading zeroes (e.g. 040, 041). Guardian linkage is shown as a flag only — no guardian PII is rendered here."
        />

        {authNote && (
          <div className="mt-8">
            <AccessNote message={authNote} signInHref="/login/admin" signInLabel="Sign In" />
          </div>
        )}

        {!authNote && (
          <div className="mt-10">
            <div className="mb-6">
              <label htmlFor="roster-search" className="sr-only">
                Search students
              </label>
              <Input
                id="roster-search"
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="search by name or admission number"
                className="w-full sm:w-96"
              />
            </div>

            <Panel
              withTopBar
              topBar={
                <>
                  <span>01 / STUDENTS</span>
                  <span className="text-muted">
                    {filtered.length} / {students.length}
                  </span>
                </>
              }
            >
              {loading ? (
                <LoadingState message="Loading roster…" />
              ) : filtered.length === 0 ? (
                <EmptyState message="No matches." icon="history" />
              ) : (
                <Table>
                  <thead>
                    <tr className="border-b border-line">
                      <Th>ADM</Th>
                      <Th>NAME</Th>
                      <Th>GENDER</Th>
                      <Th>DOB</Th>
                      <Th>CLASS</Th>
                      <Th>GUARDIAN</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => {
                      const cls = classes.find((c) => c.class_id === s.class_id);
                      const linked = !!guardianLinked[s.student_id];
                      return (
                        <tr key={s.student_id} className="border-b border-line/60 hover:bg-panel-alt transition-colors">
                          <Td>
                            <span className="font-mono tabular-nums">{s.admission_no}</span>
                          </Td>
                          <Td className="font-display text-lg uppercase text-bone">{s.name}</Td>
                          <Td>{s.gender ?? "—"}</Td>
                          <Td className="font-mono text-mono-xs uppercase tracking-widest text-muted">
                            {s.dob ?? "—"}
                          </Td>
                          <Td>{cls?.class_name ?? "—"}</Td>
                          <Td>
                            {linked ? (
                              <span className="inline-flex items-center gap-2 text-success">
                                <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_#B7EF42]" />
                                <MonoLabel size="xs" tone="success">LINKED</MonoLabel>
                              </span>
                            ) : (
                              <MonoLabel size="xs" tone="muted">NONE</MonoLabel>
                            )}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </Panel>
          </div>
        )}
      </main>
    </>
  );
}
