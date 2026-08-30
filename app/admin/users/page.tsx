"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { TopNav } from "@/components/ui/TopNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccessNote } from "@/components/ui/AccessNote";
import { Alert } from "@/components/ui/Alert";
import { LoadingState, EmptyState } from "@/components/ui/StateBlock";
import { Table, Th, Td } from "@/components/ui/Table";
import { PrimaryButton, GhostButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth/session";
import { manageIdentity } from "@/lib/dismissal/client";

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
const ROLES: Array<UserRow["role"]> = ["parent", "teacher", "gate", "admin"];

export default function AdminUsersPage() {
  const supabase = getSupabaseBrowserClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [students, setStudents] = useState<Record<string, StudentLite>>({});
  const [classes, setClasses] = useState<Record<string, ClassLite>>({});
  const [loading, setLoading] = useState(true);
  const [authNote, setAuthNote] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ id: string; password: string } | null>(null);

  // Create form
  const [createRole, setCreateRole] = useState<UserRow["role"]>("parent");
  const [createLoginId, setCreateLoginId] = useState("");
  const [createStudentId, setCreateStudentId] = useState("");
  const [createClassId, setCreateClassId] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: us }, { data: stus }, { data: cls }] = await Promise.all([
      supabase
        .from("users")
        .select("user_id, role, login_id, credential_status, linked_student_id, assigned_class_id")
        .order("role", { ascending: true }),
      supabase.from("students").select("student_id, name, admission_no"),
      supabase.from("classes").select("class_id, class_name")
    ]);
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
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const su = await getSessionUser(supabase);
      if (!su || su.role !== "admin") {
        if (!cancelled) {
          setAuthNote("Sign in as an admin to manage identities.");
          setLoading(false);
        }
        return;
      }
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function run(action: string, userId: string, extra: Record<string, unknown> = {}) {
    setBusyId(userId);
    setNotice(null);
    try {
      const res = await manageIdentity(action, { target_user_id: userId, ...extra });
      if (res.plaintext_password) {
        setFlash({ id: userId, password: res.plaintext_password });
      }
      setNotice(`${action} ok`);
      await load();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "Action failed";
      setNotice(msg);
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setNotice(null);
    try {
      const extra: Record<string, unknown> = { login_id: createLoginId.trim() };
      if (createRole === "parent") extra.student_id = createStudentId;
      if (createRole === "teacher") extra.class_id = createClassId || undefined;
      const res = await manageIdentity("create", extra);
      if (res.plaintext_password) setFlash({ id: createLoginId, password: res.plaintext_password });
      setCreateLoginId("");
      setCreateStudentId("");
      setCreateClassId("");
      setNotice("Identity created.");
      await load();
    } catch (e: unknown) {
      setNotice((e as { message?: string })?.message ?? "Create failed");
    } finally {
      setCreating(false);
    }
  }

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
          eyebrow="04 / USERS"
          title={`${users.length} Application Users`}
          description="Per-person identity management. Every person authenticates with their own ID and password — no shared accounts. Authorization stays enforced by the database; this UI only issues lifecycle actions confined to your school."
        />

        {flash && (
          <Alert tone="warn" className="mt-6">
            <span className="font-mono">ONE-TIME PASSWORD for {flash.id}: {flash.password}</span>{" "}
            <GhostButton size="sm" onClick={() => setFlash(null)}>Dismiss</GhostButton>
          </Alert>
        )}
        {notice && <Alert tone="info" className="mt-4">{notice}</Alert>}

        {authNote && (
          <div className="mt-8">
            <AccessNote message={authNote} signInHref="/login/admin" signInLabel="Sign In" />
          </div>
        )}

        {!authNote && (
          <>
            <div className="mt-10">
              <Panel withTopBar topBar={<span>00 / CREATE IDENTITY</span>}>
                <form onSubmit={handleCreate} className="p-7 flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2">
                      <MonoLabel size="sm" tone="muted">ROLE</MonoLabel>
                      <Select value={createRole} onChange={(v) => setCreateRole(v as UserRow["role"])}>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r.toUpperCase()}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <MonoLabel size="sm" tone="muted">LOGIN ID</MonoLabel>
                      <Input
                        value={createLoginId}
                        onChange={(e) => setCreateLoginId(e.target.value)}
                        placeholder="unique staff / gate / admin / parent id"
                        required
                      />
                    </div>
                    {createRole === "parent" ? (
                      <div className="flex flex-col gap-2">
                        <MonoLabel size="sm" tone="muted">LINK STUDENT</MonoLabel>
                        <Select value={createStudentId} onChange={setCreateStudentId}>
                          <option value="">— select —</option>
                          {Object.entries(students).map(([id, s]) => (
                            <option key={id} value={id}>{s.name} · ADM {s.admission_no}</option>
                          ))}
                        </Select>
                      </div>
                    ) : createRole === "teacher" ? (
                      <div className="flex flex-col gap-2">
                        <MonoLabel size="sm" tone="muted">ASSIGN CLASS</MonoLabel>
                        <Select value={createClassId} onChange={setCreateClassId}>
                          <option value="">— select —</option>
                          {Object.entries(classes).map(([id, c]) => (
                            <option key={id} value={id}>{c.class_name}</option>
                          ))}
                        </Select>
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>
                  <div>
                    <PrimaryButton type="submit" disabled={creating} loading={creating}>
                      {creating ? "Creating…" : "Create Identity"}
                    </PrimaryButton>
                  </div>
                </form>
              </Panel>
            </div>

            <div className="mt-8">
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
                  <LoadingState message="Loading users…" />
                ) : users.length === 0 ? (
                  <EmptyState message="No users found." icon="user" />
                ) : (
                  <Table>
                    <thead>
                      <tr className="border-b border-line">
                        <Th>ROLE</Th>
                        <Th>LOGIN</Th>
                        <Th>LINKED STUDENT</Th>
                        <Th>ASSIGNED CLASS</Th>
                        <Th>STATUS</Th>
                        <Th>ACTIONS</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const stu = u.linked_student_id ? students[u.linked_student_id] : null;
                        const cls = u.assigned_class_id ? classes[u.assigned_class_id] : null;
                        const active = u.credential_status === "active";
                        const busy = busyId === u.user_id;
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
                              <span className={`inline-flex items-center gap-2 ${active ? "text-success" : "text-warn"}`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                <MonoLabel size="sm" tone={active ? "success" : "muted"}>
                                  {u.credential_status.toUpperCase()}
                                </MonoLabel>
                              </span>
                            </Td>
                            <Td>
                              <div className="flex flex-wrap gap-2">
                                <GhostButton size="sm" disabled={busy} onClick={() => run("reset", u.user_id)}>
                                  Reset
                                </GhostButton>
                                <GhostButton
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => run(active ? "deactivate" : "activate", u.user_id)}
                                >
                                  {active ? "Deactivate" : "Activate"}
                                </GhostButton>
                                {u.role === "parent" && (
                                  <>
                                    <Select
                                      value=""
                                      onChange={(sid) => sid && run("link", u.user_id, { student_id: sid })}
                                      className="text-mono-xs"
                                    >
                                      <option value="">Link…</option>
                                      {Object.entries(students).map(([id, s]) => (
                                        <option key={id} value={id}>{s.name} · ADM {s.admission_no}</option>
                                      ))}
                                    </Select>
                                    {u.linked_student_id && (
                                      <GhostButton size="sm" disabled={busy} onClick={() => run("unlink", u.user_id)}>
                                        Unlink
                                      </GhostButton>
                                    )}
                                  </>
                                )}
                                {u.role === "teacher" && (
                                  <>
                                    <Select
                                      value=""
                                      onChange={(cid) => cid && run("assign", u.user_id, { class_id: cid })}
                                      className="text-mono-xs"
                                    >
                                      <option value="">Assign…</option>
                                      {Object.entries(classes).map(([id, c]) => (
                                        <option key={id} value={id}>{c.class_name}</option>
                                      ))}
                                    </Select>
                                    {u.assigned_class_id && (
                                      <GhostButton size="sm" disabled={busy} onClick={() => run("unassign", u.user_id)}>
                                        Unassign
                                      </GhostButton>
                                    )}
                                  </>
                                )}
                              </div>
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                )}
              </Panel>
            </div>
          </>
        )}
      </main>
    </>
  );
}
