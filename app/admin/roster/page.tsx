"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  gender: string | null;
  dob: string | null;
  class_id: string | null;
};

export default function AdminRosterPage() {
  const supabase = getSupabaseBrowserClient();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) {
          setAuthNote("Sign in at /login/admin to view the roster.");
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
            .select("student_id, name, admission_no, gender, dob, class_id")
            .order("admission_no", { ascending: true })
        ]);
        if (cancelled) return;
        setClasses((cls ?? []) as ClassRow[]);
        setStudents((stu ?? []) as StudentRow[]);
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
            ← Back to overview
          </Link>
        }
      />

      <main className="pt-24 pb-16 section-shell">
        <span className="eyebrow">
          <i />
          04 / ROSTER
        </span>
        <h2 className="font-display text-display-md uppercase text-bone mt-4">
          {students.length} Students
        </h2>
        <p className="text-muted mt-3 max-w-2xl">
          The full seeded roster. Admission numbers retain their leading
          zeroes (e.g. <span className="font-mono">040</span>,{" "}
          <span className="font-mono">041</span>).
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
          <div className="mt-10">
            <div className="mb-6">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="search by name or admission number"
                className="h-12 w-full sm:w-96 px-4 bg-ink text-bone border border-line rounded-none font-mono text-mono-sm outline-none focus:border-accent transition-colors"
              />
            </div>

            <Panel
              withTopBar
              topBar={
                <>
                  <span>01 / STUDENTS</span>
                  <span className="text-muted">{filtered.length} / {students.length}</span>
                </>
              }
            >
              {loading ? (
                <div className="p-10 flex items-center justify-center">
                  <Icon name="timer" className="h-5 w-5 text-muted" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-7 text-muted">No matches.</div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line">
                      <Th>ADM</Th>
                      <Th>NAME</Th>
                      <Th>GENDER</Th>
                      <Th>DOB</Th>
                      <Th>CLASS</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => {
                      const cls = classes.find((c) => c.class_id === s.class_id);
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>
        )}
      </main>
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 font-mono uppercase tracking-widest text-mono-xs text-muted">
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-5 py-4 ${className}`}>{children}</td>
  );
}
