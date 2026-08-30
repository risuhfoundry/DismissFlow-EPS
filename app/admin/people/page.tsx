"use client";

import { useEffect, useMemo, useState } from "react";
import { Page, Section } from "@/components/layout/Page";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/StateBlock";
import { DataTable } from "@/components/ui/DataTable";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SearchField, AccessNote, Pager } from "../_ui";

type Role = "parent" | "teacher" | "gate" | "admin";
type UserRow = {
  user_id: string;
  role: Role;
  login_id: string | null;
  credential_status: string;
  linked_student_id: string | null;
  assigned_class_id: string | null;
};
type StudentLite = { name: string; admission_no: string };
type ClassLite = { class_name: string };

const ROLE_TONE: Record<Role, StatusTone> = {
  admin: "primary",
  teacher: "info",
  gate: "warning",
  parent: "neutral"
};
const ROLES: Role[] = ["parent", "teacher", "gate", "admin"];
const PAGE_SIZE = 10;

export default function AdminPeoplePage() {
  const supabase = getSupabaseBrowserClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [students, setStudents] = useState<Record<string, StudentLite>>({});
  const [classes, setClasses] = useState<Record<string, ClassLite>>({});
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<{
    tone: "info" | "warning";
    message: string;
  } | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const su = await getSessionUser(supabase);
        if (!su || su.role !== "admin") {
          if (!cancelled)
            setAccess({
              tone: "warning",
              message: "This area is for school administrators. Sign in to view people."
            });
          return;
        }
        const [{ data: us }, { data: stus }, { data: cls }] = await Promise.all([
          supabase
            .from("users")
            .select(
              "user_id, role, login_id, credential_status, linked_student_id, assigned_class_id"
            )
            .order("role", { ascending: true }),
          supabase.from("students").select("student_id, name, admission_no"),
          supabase.from("classes").select("class_id, class_name")
        ]);
        if (cancelled) return;
        const rows = ((us ?? []) as UserRow[]).slice().sort(
          (a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role)
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
        if (!cancelled)
          setAccess({
            tone: "info",
            message: "We couldn't load people. Please try again shortly."
          });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!needle) return true;
      const linked = u.linked_student_id ? students[u.linked_student_id] : null;
      const assigned = u.assigned_class_id ? classes[u.assigned_class_id] : null;
      return (
        (u.login_id ?? "").toLowerCase().includes(needle) ||
        (linked?.name.toLowerCase().includes(needle) ?? false) ||
        (linked ? `adm ${linked.admission_no}`.includes(needle) : false) ||
        (assigned?.class_name.toLowerCase().includes(needle) ?? false) ||
        u.role.includes(needle)
      );
    });
  }, [users, q, roleFilter, students, classes]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [q, roleFilter]);

  if (access) {
    return (
      <Page title="People">
        <AccessNote
          tone={access.tone}
          message={access.message}
          signInHref="/login/admin"
          signInLabel="Sign in"
        />
      </Page>
    );
  }

  return (
    <Page
      title="People"
      description="Every account at your school, grouped by role. Authorization stays enforced by the database — this view only reads identities your role is allowed to see. No emails or internal IDs are shown."
    >
      <Section title="Application accounts">
        <Card>
          <CardHeader
            title="Accounts"
            description="Staff and parent accounts scoped to your school."
            action={
              <span className="text-sm text-muted-foreground tabular-nums">
                {filtered.length}
              </span>
            }
          />
          <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-end">
            <SearchField
              id="people-search"
              label="Search"
              value={q}
              onChange={setQ}
              placeholder="Login ID, linked student, or class"
            />
            <div className="w-full sm:w-48">
              <label htmlFor="people-role" className="text-label font-medium text-foreground">
                Role
              </label>
              <Select
                id="people-role"
                value={roleFilter}
                onChange={(v) => setRoleFilter(v as "all" | Role)}
              >
                <option value="all">All roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r[0].toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>

          <DataTable<UserRow>
            rowKey={(r) => r.user_id}
            loading={loading}
            rows={pageRows}
            empty={
              <EmptyState
                icon="users"
                title="No accounts found"
                description="Try a different search or role filter."
              />
            }
            columns={[
              {
                key: "role",
                header: "Role",
                render: (r) => (
                  <StatusBadge tone={ROLE_TONE[r.role]}>
                    {r.role.toUpperCase()}
                  </StatusBadge>
                )
              },
              {
                key: "login_id",
                header: "Login ID",
                render: (r) => (
                  <span className="font-medium text-foreground">
                    {r.login_id ?? "—"}
                  </span>
                )
              },
              {
                key: "linked",
                header: "Linked student",
                render: (r) => {
                  const s = r.linked_student_id ? students[r.linked_student_id] : null;
                  return s ? (
                    <span className="text-foreground">
                      {s.name}{" "}
                      <span className="text-muted-foreground tabular-nums">
                        (ADM {s.admission_no})
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  );
                }
              },
              {
                key: "assigned",
                header: "Assigned class",
                render: (r) => {
                  const c = r.assigned_class_id ? classes[r.assigned_class_id] : null;
                  return (
                    <span className="text-foreground">{c ? c.class_name : "—"}</span>
                  );
                }
              },
              {
                key: "status",
                header: "Status",
                render: (r) => {
                  const active = r.credential_status === "active";
                  return (
                    <StatusBadge tone={active ? "success" : "neutral"}>
                      {r.credential_status.toUpperCase()}
                    </StatusBadge>
                  );
                }
              }
            ]}
          />
          <Pager
            page={safePage}
            pageCount={pageCount}
            onPage={setPage}
            total={filtered.length}
          />
        </Card>
      </Section>
    </Page>
  );
}
