"use client";

import { useCallback, useEffect, useState } from "react";
import { Page, Section } from "@/components/layout/Page";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Icon } from "@/components/ui/Icon";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRealtimeStatus, useTableChanges } from "@/lib/realtime/subs";
import {
  DISMISSAL_STATUSES,
  dismissalStatusLabel,
  dismissalStatusTone,
  type DismissalStatus
} from "@/lib/dismissal/state";
import { StatTile, AccessNote } from "./_ui";

type ReqRow = {
  request_id: string;
  student_id: string;
  status: DismissalStatus;
  created_at: string;
  expires_at: string | null;
};
type StudentLite = {
  name: string;
  admission_no: string;
  class_name: string | null;
};

// Live connection badge, mirroring the Gate/Teacher portals.
const REALTIME_TONE: Record<string, { label: string; tone: StatusTone }> = {
  live: { label: "Live", tone: "primary" },
  reconnecting: { label: "Reconnecting", tone: "warning" },
  closed: { label: "Offline", tone: "danger" },
  connecting: { label: "Connecting", tone: "neutral" }
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function AdminOverviewPage() {
  const supabase = getSupabaseBrowserClient();
  const [stats, setStats] = useState({
    students: 0,
    classes: 0,
    parents: 0,
    teachers: 0,
    gates: 0,
    requests: 0,
    active: 0,
    awaiting: 0,
    dismissed: 0,
    resolved: 0
  });
  const [recent, setRecent] = useState<ReqRow[]>([]);
  const [students, setStudents] = useState<Record<string, StudentLite>>({});
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<{
    tone: "info" | "warning";
    message: string;
  } | null>(null);
  const status$ = useRealtimeStatus(supabase, "dismissal_requests");

  const refresh = useCallback(async () => {
    const sessionUser = await getSessionUser(supabase);
    if (!sessionUser || sessionUser.role !== "admin") {
      setAccess({
        tone: "warning",
        message: "This area is for school administrators. Sign in to view the operations overview."
      });
      setLoading(false);
      return;
    }

    // All counts are exact head queries, RLS-scoped to the admin's own school.
    // Nothing is hardcoded — every figure comes from the database.
    const [
      { count: studentsC },
      { count: classesC },
      { count: parentsC },
      { count: teachersC },
      { count: gatesC },
      { count: requestsC },
      { count: activeC },
      { count: awaitingC },
      { count: dismissedC },
      { count: resolvedC }
    ] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("classes").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "parent"),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "teacher"),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "gate"),
      supabase.from("dismissal_requests").select("*", { count: "exact", head: true }),
      supabase
        .from("dismissal_requests")
        .select("*", { count: "exact", head: true })
        .in("status", ["REQUESTED", "AWAITING_TEACHER"]),
      supabase
        .from("dismissal_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "AWAITING_TEACHER"),
      supabase
        .from("dismissal_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "DISMISSED"),
      supabase
        .from("dismissal_requests")
        .select("*", { count: "exact", head: true })
        .in("status", ["REJECTED", "CANCELLED"])
    ]);

    setStats({
      students: studentsC ?? 0,
      classes: classesC ?? 0,
      parents: parentsC ?? 0,
      teachers: teachersC ?? 0,
      gates: gatesC ?? 0,
      requests: requestsC ?? 0,
      active: activeC ?? 0,
      awaiting: awaitingC ?? 0,
      dismissed: dismissedC ?? 0,
      resolved: resolvedC ?? 0
    });

    // Recent operational activity (real rows, hydrated with student/class names).
    const { data: reqs, error: reqErr } = await supabase
      .from("dismissal_requests")
      .select("request_id, student_id, status, created_at, expires_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (reqErr) throw reqErr;
    const rows = (reqs ?? []) as ReqRow[];
    setRecent(rows);

    const ids = Array.from(new Set(rows.map((r) => r.student_id)));
    if (ids.length > 0) {
      const { data: stus } = await supabase
        .from("students")
        .select("student_id, name, admission_no, class_id");
      const { data: cls } = await supabase.from("classes").select("class_id, class_name");
      const clsMap: Record<string, string> = {};
      for (const c of cls ?? []) clsMap[c.class_id] = c.class_name;
      const map: Record<string, StudentLite> = {};
      for (const s of stus ?? []) {
        map[s.student_id] = {
          name: s.name,
          admission_no: s.admission_no,
          class_name: s.class_id ? clsMap[s.class_id] ?? null : null
        };
      }
      setStudents(map);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch {
        if (!cancelled)
          setAccess({
            tone: "info",
            message: "We couldn't load the operations overview. Please try again shortly."
          });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Realtime: re-fetch on any dismissal_requests change. Reflect-only.
  const handleChange = useCallback(() => {
    refresh().catch(() => {});
  }, [refresh]);
  useTableChanges<ReqRow>(supabase, "dismissal_requests", "*", handleChange);

  const liveMeta = REALTIME_TONE[status$] ?? REALTIME_TONE.connecting;

  return (
    <Page
      title="Today's operations"
      description="Live operational picture for your school. Every figure is computed from the database by the administrator's Row-Level Security scope — nothing is hardcoded. Dismissal state itself is owned by the trusted Edge Functions; this portal only observes it."
      actions={
        <StatusBadge tone={liveMeta.tone} pulse={status$ === "live"}>
          {liveMeta.label}
        </StatusBadge>
      }
    >
      {access && (
        <AccessNote
          tone={access.tone}
          message={access.message}
          signInHref="/login/admin"
          signInLabel="Sign in"
        />
      )}

      {!access && loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-7 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!access && !loading && (
        <div className="space-y-10">
          <Section title="School population">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatTile label="Students" value={stats.students} />
              <StatTile label="Classes" value={stats.classes} />
              <StatTile label="Parents" value={stats.parents} />
              <StatTile label="Teachers" value={stats.teachers} />
              <StatTile label="Gate staff" value={stats.gates} />
            </div>
          </Section>

          <Section title="Dismissals">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatTile label="Total requests" value={stats.requests} />
              <StatTile label="Active" value={stats.active} accent />
              <StatTile label="Awaiting teacher" value={stats.awaiting} accent />
              <StatTile label="Dismissed" value={stats.dismissed} />
              <StatTile label="Rejected / cancelled" value={stats.resolved} />
            </div>
          </Section>

          <Section
            title="Recent dismissal activity"
            action={
              <a
                href="/admin/dismissals"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View all
                <Icon name="chevron.right" className="h-4 w-4" strokeWidth={2} />
              </a>
            }
          >
            <Card>
              {recent.length === 0 ? (
                <CardContent className="py-10">
                  <p className="text-center text-sm text-muted-foreground">
                    No dismissal requests yet.
                  </p>
                </CardContent>
              ) : (
                <ul className="divide-y divide-border">
                  {recent.slice(0, 8).map((r) => {
                    const s = students[r.student_id];
                    return (
                      <li
                        key={r.request_id}
                        className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 flex-col gap-1">
                          <p className="truncate font-semibold text-foreground">
                            {s?.name ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            ADM {s?.admission_no ?? "—"}
                            {s?.class_name ? ` · ${s.class_name}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {fmtTime(r.created_at)}
                          </span>
                          <StatusBadge tone={dismissalStatusTone(r.status)}>
                            {dismissalStatusLabel(r.status)}
                          </StatusBadge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </Section>

          <Section title="Status mix">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {DISMISSAL_STATUSES.map((s) => (
                <StatTile
                  key={s}
                  label={dismissalStatusLabel(s)}
                  value={
                    recent.filter((r) => r.status === s).length
                  }
                />
              ))}
            </div>
          </Section>
        </div>
      )}
    </Page>
  );
}
