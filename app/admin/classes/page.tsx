"use client";

import { useEffect, useMemo, useState } from "react";
import { Page, Section } from "@/components/layout/Page";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Icon } from "@/components/ui/Icon";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SearchField, AccessNote, StatTile } from "../_ui";

type ClassRow = {
  class_id: string;
  class_name: string;
  section: string | null;
  teacher_id: string | null;
};
const PAGE_SIZE = 9;

export default function AdminClassesPage() {
  const supabase = getSupabaseBrowserClient();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [teacherLogin, setTeacherLogin] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<{
    tone: "info" | "warning";
    message: string;
  } | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const su = await getSessionUser(supabase);
        if (!su || su.role !== "admin") {
          if (!cancelled)
            setAccess({
              tone: "warning",
              message: "This area is for school administrators. Sign in to view classes."
            });
          return;
        }
        const [{ data: cls }, { data: stus }, { data: teachers }] = await Promise.all([
          supabase
            .from("classes")
            .select("class_id, class_name, section, teacher_id")
            .order("class_name", { ascending: true }),
          supabase.from("students").select("student_id, class_id"),
          supabase.from("users").select("user_id, login_id, role").eq("role", "teacher")
        ]);
        if (cancelled) return;
        const rows = (cls ?? []) as ClassRow[];
        setClasses(rows);

        const counts: Record<string, number> = {};
        for (const c of rows) counts[c.class_id] = 0;
        for (const s of (stus ?? []) as { class_id: string | null }[]) {
          if (s.class_id && counts[s.class_id] !== undefined) counts[s.class_id] += 1;
        }
        setStudentCounts(counts);

        const tmap: Record<string, string> = {};
        for (const t of (teachers ?? []) as { user_id: string; login_id: string | null }[]) {
          if (t.login_id) tmap[t.user_id] = t.login_id;
        }
        setTeacherLogin(tmap);
      } catch {
        if (!cancelled)
          setAccess({
            tone: "info",
            message: "We couldn't load classes. Please try again shortly."
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
    if (!needle) return classes;
    return classes.filter((c) => {
      const teacher = c.teacher_id ? teacherLogin[c.teacher_id] : null;
      return (
        c.class_name.toLowerCase().includes(needle) ||
        (c.section ?? "").toLowerCase().includes(needle) ||
        (teacher?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [classes, q, teacherLogin]);

  if (access) {
    return (
      <Page title="Classes">
        <AccessNote
          tone={access.tone}
          message={access.message}
          signInHref="/login/admin"
          signInLabel="Sign in"
        />
      </Page>
    );
  }

  const totalStudents = Object.values(studentCounts).reduce((a, b) => a + b, 0);

  return (
    <Page
      title="Classes"
      description="Every class at your school, with the assigned teacher and the live student count. All data is read from the database — nothing is hardcoded."
    >
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 py-6">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Section title="Classes">
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatTile label="Classes" value={classes.length} />
            <StatTile label="Total students" value={totalStudents} />
            <StatTile
              label="With teacher"
              value={classes.filter((c) => c.teacher_id).length}
            />
          </div>

          <Card>
            <CardHeader title="Class list" />
            <CardContent className="py-4">
              <SearchField
                id="classes-search"
                label="Search"
                value={q}
                onChange={setQ}
                placeholder="Class, section, or teacher"
              />
            </CardContent>

            {filtered.length === 0 ? (
              <CardContent className="py-10">
                <p className="text-center text-sm text-muted-foreground">
                  No classes match your search.
                </p>
              </CardContent>
            ) : (
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((c) => {
                  const teacher = c.teacher_id ? teacherLogin[c.teacher_id] : null;
                  return (
                    <Card key={c.class_id} tone="muted">
                      <CardContent className="flex flex-col gap-4 py-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-title font-semibold text-foreground">
                              {c.class_name}
                            </p>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              {c.section ? c.section : "No section"}
                            </p>
                          </div>
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
                            <Icon name="school" className="h-4 w-4" strokeWidth={2} />
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">
                              Teacher
                            </span>
                            {teacher ? (
                              <span className="text-sm font-medium text-foreground">
                                {teacher}
                              </span>
                            ) : (
                              <StatusBadge tone="neutral">Unassigned</StatusBadge>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">
                              Students
                            </span>
                            <span className="text-2xl font-semibold tabular-nums text-foreground">
                              {studentCounts[c.class_id] ?? 0}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>
        </Section>
      )}
    </Page>
  );
}
