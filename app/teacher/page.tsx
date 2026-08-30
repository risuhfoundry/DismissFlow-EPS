"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/StateBlock";
import { Page, Section } from "@/components/layout/Page";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRealtimeStatus, useTableChanges } from "@/lib/realtime/subs";
import type { DismissalStatus } from "@/lib/dismissal/state";

type QueueRequest = {
  request_id: string;
  student_id: string;
  status: DismissalStatus;
  created_at: string;
  updated_at: string;
};

type StudentLite = { name: string; admission_no: string };

type Access = {
  tone: "info" | "warning";
  message: string;
  cta: "signin" | "home";
};

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

// How long the request has been waiting on the teacher (since the gate scan that
// moved it to AWAITING_TEACHER — reflected by updated_at).
function waitedLabel(iso: string): string {
  const mins = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  );
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export default function TeacherQueuePage() {
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<QueueRequest[]>([]);
  const [students, setStudents] = useState<Record<string, StudentLite>>({});
  // Mirror of `students` for use inside the realtime handler so the handler
  // (and therefore the useTableChanges subscription) stays stable and never
  // thrashes the realtime channel. Kept in sync via the effect below.
  const studentsRef = useRef<Record<string, StudentLite>>({});
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);
  const [classMeta, setClassMeta] = useState<{ name: string; section: string }>(
    { name: "", section: "" }
  );
  const [access, setAccess] = useState<Access | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const status$ = useRealtimeStatus(supabase, "dismissal_requests");

  const classLabel = useMemo(() => {
    if (!classMeta.name) return "Your class";
    return classMeta.section
      ? `${classMeta.name} · ${classMeta.section}`
      : classMeta.name;
  }, [classMeta]);

  const fetchStudent = useCallback(
    async (studentId: string) => {
      const { data } = await supabase
        .from("students")
        .select("student_id, name, admission_no")
        .eq("student_id", studentId)
        .maybeSingle();
      if (data) {
        setStudents((m) => ({
          ...m,
          [data.student_id]: {
            name: data.name,
            admission_no: data.admission_no
          }
        }));
      }
    },
    [supabase]
  );

  // Realtime handler — the server is the authority; the browser only reflects.
  // RLS already limits the stream to the teacher's assigned class, but we still
  // guard on status so a stray payload can't inject a row. AWAITING_TEACHER rows
  // are upserted (replace by request_id) and re-sorted; any other status means
  // the request was decided elsewhere and is dropped from the queue.
  const handleChange = useCallback(
    (row: QueueRequest) => {
      setRows((current) => {
        const next = current.filter((r) => r.request_id !== row.request_id);
        if (row.status === "AWAITING_TEACHER") {
          next.push(row);
          next.sort((a, b) => a.updated_at.localeCompare(b.updated_at));
        }
        return next;
      });
      if (row.student_id && !studentsRef.current[row.student_id]) {
        void fetchStudent(row.student_id);
      }
    },
    [fetchStudent]
  );

  useTableChanges<QueueRequest>(
    supabase,
    "dismissal_requests",
    "*",
    handleChange
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled)
            setAccess({
              tone: "info",
              message: "Sign in to review dismissal requests for your class.",
              cta: "signin"
            });
          return;
        }

        const sessionUser = await getSessionUser(supabase);
        if (!sessionUser || sessionUser.role !== "teacher") {
          if (!cancelled)
            setAccess({
              tone: "warning",
              message: "This area is for teachers.",
              cta: "home"
            });
          return;
        }
        if (!sessionUser.assignedClassId) {
          if (!cancelled)
            setAccess({
              tone: "warning",
              message:
                "No class is assigned to this account. Contact your school administrator.",
              cta: "home"
            });
          return;
        }

        const { data: cls } = await supabase
          .from("classes")
          .select("class_name, section")
          .eq("class_id", sessionUser.assignedClassId)
          .maybeSingle();
        if (!cancelled && cls) {
          setClassMeta({
            name: cls.class_name ?? "",
            section: cls.section ?? ""
          });
        }

        // RLS scopes this to the teacher's assigned class — the browser never
        // supplies the class filter. Only live AWAITING_TEACHER requests appear.
        const { data: queue, error: qErr } = await supabase
          .from("dismissal_requests")
          .select("request_id, student_id, status, created_at, updated_at")
          .eq("status", "AWAITING_TEACHER")
          .order("updated_at", { ascending: true })
          .limit(50);
        if (qErr) throw qErr;

        if (!cancelled) setRows((queue ?? []) as QueueRequest[]);

        const studentIds = Array.from(
          new Set((queue ?? []).map((r) => r.student_id))
        );
        if (studentIds.length > 0) {
          const { data: stus } = await supabase
            .from("students")
            .select("student_id, name, admission_no")
            .in("student_id", studentIds);
          const map: Record<string, StudentLite> = {};
          for (const s of stus ?? []) {
            map[s.student_id] = {
              name: s.name,
              admission_no: s.admission_no
            };
          }
          if (!cancelled) setStudents(map);
        }

        if (!cancelled) {
          setLoaded(true);
        }
      } catch {
        if (!cancelled)
          setAccess({
            tone: "warning",
            message: "We couldn't load your queue. Please try again shortly.",
            cta: "home"
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const liveMeta: { label: string; tone: StatusTone } =
    status$ === "live"
      ? { label: "Live", tone: "primary" }
      : status$ === "reconnecting"
        ? { label: "Reconnecting", tone: "warning" }
        : status$ === "closed"
          ? { label: "Offline", tone: "danger" }
          : { label: "Connecting", tone: "neutral" };

  if (access) {
    const href = access.cta === "signin" ? "/login/teacher" : "/";
    const cta = access.cta === "signin" ? "Sign in" : "Back to home";
    return (
      <Page title="Teacher queue">
        <Card>
          <CardContent className="flex flex-col gap-4 py-8">
            <Alert tone={access.tone}>{access.message}</Alert>
            <div>
              <Link href={href}>
                <Button variant={access.cta === "signin" ? "primary" : "outline"}>
                  {cta}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </Page>
    );
  }

  if (!loaded) {
    return (
      <Page title={classLabel}>
        <Section title="Pending pickups">
          <Card>
            <CardContent className="space-y-4 p-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-28 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </Section>
      </Page>
    );
  }

  return (
    <Page
      title={classLabel}
      description="Live pickup requests for your assigned class. The list updates as gate scans arrive — no refresh needed."
      actions={
        <StatusBadge tone={liveMeta.tone} pulse={status$ === "live"}>
          {liveMeta.label}
        </StatusBadge>
      }
    >
      <Section title="Pending pickups">
        <Card>
          {queueError && (
            <CardContent className="border-b border-border">
              <Alert tone="warning">{queueError}</Alert>
            </CardContent>
          )}
          {rows.length === 0 ? (
            <EmptyState
              icon="clipboard"
              title="You're all caught up."
              description="There are no dismissal requests waiting for your attention."
            />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const s = students[r.student_id];
                return (
                  <li key={r.request_id}>
                    <Link
                      href={`/teacher/${r.request_id}`}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted"
                    >
                      <Avatar name={s?.name ?? "?"} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">
                          {s?.name ?? "—"}
                        </p>
                        <p className="text-sm text-muted-foreground tabular-nums">
                          ADM {s?.admission_no ?? "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge tone="info" pulse>
                          Awaiting decision
                        </StatusBadge>
                        <div className="hidden text-right sm:block">
                          <p className="text-xs text-muted-foreground">
                            Scanned {clockTime(r.updated_at)}
                          </p>
                          <p className="text-xs font-medium text-muted-foreground">
                            {waitedLabel(r.updated_at)}
                          </p>
                        </div>
                        <Icon
                          name="chevron.right"
                          className="h-5 w-5 shrink-0 text-muted-foreground"
                          strokeWidth={2}
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </Section>
    </Page>
  );
}
