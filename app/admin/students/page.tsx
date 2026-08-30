"use client";

import { useEffect, useMemo, useState } from "react";
import { Page, Section } from "@/components/layout/Page";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/StateBlock";
import { DataTable } from "@/components/ui/DataTable";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SearchField, AccessNote, Pager } from "../_ui";

type StudentRow = {
  student_id: string;
  name: string;
  admission_no: string;
  gender: string | null;
  dob: string | null;
  class_id: string | null;
};
type ClassLite = { class_name: string };
const PAGE_SIZE = 10;

export default function AdminStudentsPage() {
  const supabase = getSupabaseBrowserClient();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<Record<string, ClassLite>>({});
  const [guardianLinked, setGuardianLinked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<{
    tone: "info" | "warning";
    message: string;
  } | null>(null);
  const [q, setQ] = useState("");
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
              message: "This area is for school administrators. Sign in to view students."
            });
          return;
        }
        const [{ data: stu }, { data: cls }, { data: sg }] = await Promise.all([
          supabase
            .from("students")
            .select("student_id, name, admission_no, gender, dob, class_id")
            .order("admission_no", { ascending: true }),
          supabase.from("classes").select("class_id, class_name"),
          // Only the linkage flag is needed — guardian PII is never pulled here.
          supabase.from("student_guardians").select("student_id")
        ]);
        if (cancelled) return;
        setStudents((stu ?? []) as StudentRow[]);
        const cmap: Record<string, ClassLite> = {};
        for (const c of (cls ?? []) as { class_id: string; class_name: string }[]) {
          cmap[c.class_id] = { class_name: c.class_name };
        }
        setClasses(cmap);
        const linked: Record<string, boolean> = {};
        for (const row of (sg ?? []) as { student_id: string }[]) {
          linked[row.student_id] = true;
        }
        setGuardianLinked(linked);
      } catch {
        if (!cancelled)
          setAccess({
            tone: "info",
            message: "We couldn't load the roster. Please try again shortly."
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
    if (!needle) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        s.admission_no.toLowerCase().includes(needle)
    );
  }, [students, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [q]);

  if (access) {
    return (
      <Page title="Students">
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
      title="Students"
      description="The full student roster for your school. Admission numbers keep their leading zeroes. Guardian linkage is shown as a flag only — no guardian contact details are rendered here."
    >
      <Section title="Roster">
        <Card>
          <CardHeader
            title="Students"
            action={
              <span className="text-sm text-muted-foreground tabular-nums">
                {filtered.length}
              </span>
            }
          />
          <CardContent className="py-4">
            <SearchField
              id="students-search"
              label="Search"
              value={q}
              onChange={setQ}
              placeholder="Name or admission number"
            />
          </CardContent>
          <DataTable<StudentRow>
            rowKey={(r) => r.student_id}
            loading={loading}
            rows={pageRows}
            empty={
              <EmptyState
                icon="clipboard"
                title="No students found"
                description="Try a different search."
              />
            }
            columns={[
              {
                key: "admission_no",
                header: "ADM",
                render: (r) => (
                  <span className="font-medium tabular-nums text-foreground">
                    {r.admission_no}
                  </span>
                )
              },
              {
                key: "name",
                header: "Name",
                render: (r) => <span className="font-medium text-foreground">{r.name}</span>
              },
              {
                key: "gender",
                header: "Gender",
                render: (r) => (
                  <span className="text-muted-foreground">{r.gender ?? "—"}</span>
                )
              },
              {
                key: "dob",
                header: "Date of birth",
                render: (r) => (
                  <span className="text-muted-foreground tabular-nums">
                    {r.dob ?? "—"}
                  </span>
                )
              },
              {
                key: "class",
                header: "Class",
                render: (r) => {
                  const c = r.class_id ? classes[r.class_id] : null;
                  return (
                    <span className="text-foreground">{c ? c.class_name : "—"}</span>
                  );
                }
              },
              {
                key: "guardian",
                header: "Guardian",
                render: (r) =>
                  guardianLinked[r.student_id] ? (
                    <StatusBadge tone="success">Linked</StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral">None</StatusBadge>
                  )
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
