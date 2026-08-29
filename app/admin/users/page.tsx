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
  { label: "Classes", href: "/admin/classes" },
  { label: "Users", href: "/admin/users" },
  { label: "Monitor", href: "/admin/monitor" },
  { label: "Logs", href: "/admin/logs" }
];

type UserRow = {
  user_id: string;
  role: "parent" | "teacher" | "gate" | "admin";
  login_id: string | null;
  credential_status: string;
  linked_student_id: string | null;
  assigned_class_id: string | null;
};

type StudentLite = { name: string; admission_no: string };
type ClassLite = { class_name: string };

const ROLE_ORDER: Record<string, number> = { admin: 0, teacher: 1, gate: 2, parent: 3 };

export default function AdminUsersPage() {
  const supabase = getSupabaseBrowserClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [students, setStudents] = useState<Record<string, StudentLite>>({});
  const [classes, setClasses] = useState<Record<string, ClassLite>>({});
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
          setAuthNote("Sign in at /login/admin to view users.");
          setLoading(false);
          return;
        }
        // Visibility only. We read public.users (role-scoped columns) plus the
        // minimal link targets. No auth secrets, password hashes, QR token
        // hashes, or guardian PII are queried or rendered.
        const [{ data: us }, { data: stus }, { data: cls }] = await Promise.all([
          supabase
            .from("users")
            .select("user_id, role, login_id, credential_status, linked_student_id, assigned_class_id")
            .order("role", { ascending: true }),
          supabase.from("students").select("student_id, name, admission_no"),
          supabase.from("classes").select("class_id, class_name")
        ]);
        if (cancelled) return;
        const rows = ((us ?? []) as UserRow[]).slice().sort(
          (a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9)
        );
        setUsers(rows);
        const smap: Record<string, StudentLite> = {};
        for (const s of (stus ?? []) as { student_id: string; name: string; admission_no: string }[]) {
          smap[s.student_id] = { name: s.name, admission_no: s.admission_no };
        }
        setStudents(smap);
        const cmap: Record<string, ClassLite> = {};
        for (const c of (cls ?? []) as { class_id: string; class_name: string }[]) {
          cmap[c.class_id] = { class_name: c.class_name };
        }
        setClasses(cmap);
      } catch {
        if (!cancelled) setAuthNote("Could not load users.");
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
        <span className="eyebrow">
          <i />
          04 / USERS
        </span>
        <h2 className="font-display text-display-md uppercase text-bone mt-4">
          {users.length} Application Users
        </h2>
        <p className="text-muted mt-3 max-w-2xl">
          Role and link visibility for every application account. This is a
          read-only management view — no credentials, tokens, or guardian PII
          are exposed. Authorization remains enforced by the database.
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
            <Panel
              withTopBar
              topBar={
                <>
                  <span>01 / ACCOUNTS</span>
                  <span className="text-muted">{users.length}</span>
                </>
              }
            >
              {loading ? (
                <div className="p-10 flex items-center justify-center">
                  <Icon name="timer" className="h-5 w-5 text-muted" />
                </div>
              ) : users.length === 0 ? (
                <div className="p-7 text-muted">No users found.</div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line">
                      <Th>ROLE</Th>
                      <Th>LOGIN</Th>
                      <Th>LINKED STUDENT</Th>
                      <Th>ASSIGNED CLASS</Th>
                      <Th>STATUS</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const stu = u.linked_student_id ? students[u.linked_student_id] : null;
                      const cls = u.assigned_class_id ? classes[u.assigned_class_id] : null;
                      return (
                        <tr key={u.user_id} className="border-b border-line/60 hover:bg-panel-alt transition-colors">
                          <Td>
                            <span className={`inline-flex items-center gap-2 ${u.role === "admin" ? "text-accent" : "text-bone"}`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                              <MonoLabel size="sm" tone={u.role === "admin" ? "accent" : "bone"}>
                                {u.role.toUpperCase()}
                              </MonoLabel>
                            </span>
                          </Td>
                          <Td className="font-mono uppercase tracking-widest text-bone">
                            {u.login_id ?? "—"}
                          </Td>
                          <Td className="font-mono text-mono-xs uppercase tracking-widest text-muted">
                            {stu ? `${stu.name} · ADM ${stu.admission_no}` : "—"}
                          </Td>
                          <Td className="font-mono text-mono-xs uppercase tracking-widest text-muted">
                            {cls ? cls.class_name : "—"}
                          </Td>
                          <Td>
                            <span
                              className={`inline-flex items-center gap-2 ${
                                u.credential_status === "active" ? "text-success" : "text-warn"
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              <MonoLabel
                                size="xs"
                                tone={u.credential_status === "active" ? "success" : "muted"}
                              >
                                {u.credential_status.toUpperCase()}
                              </MonoLabel>
                            </span>
                          </Td>
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
