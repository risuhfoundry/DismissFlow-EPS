"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Page, Section } from "@/components/layout/Page";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/StateBlock";
import { DataTable } from "@/components/ui/DataTable";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRealtimeStatus, useTableChanges } from "@/lib/realtime/subs";
import {
  DISMISSAL_STATUSES,
  dismissalStatusLabel,
  dismissalStatusTone,
  type DismissalStatus
} from "@/lib/dismissal/state";
import { SearchField, AccessNote, Pager } from "../_ui";

type LogRow = {
  event_id: string;
  request_id: string;
  student_id: string | null;
  scanned_by: string | null;
  approved_by: string | null;
  scan_time: string | null;
  approval_time: string | null;
  final_status: DismissalStatus | null;
  created_at: string;
};
type StudentLite = { name: string; admission_no: string };
const PAGE_SIZE = 12;

const REALTIME_TONE: Record<string, { label: string; tone: StatusTone }> = {
  live: { label: "Live", tone: "primary" },
  reconnecting: { label: "Reconnecting", tone: "warning" },
  closed: { label: "Offline", tone: "danger" },
  connecting: { label: "Connecting", tone: "neutral" }
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function AdminActivityPage() {
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [students, setStudents] = useState<Record<string, StudentLite>>({});
  // Operator IDs (UUIDs) are mapped to login IDs so no raw UUIDs are shown.
  const [operatorLogin, setOperatorLogin] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<{
    tone: "info" | "warning";
    message: string;
  } | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DismissalStatus>("all");
  const [page, setPage] = useState(1);
  const status$ = useRealtimeStatus(supabase, "dismissal_events");

  const refresh = useCallback(async () => {
    const su = await getSessionUser(supabase);
    if (!su || su.role !== "admin") {
      setAccess({
        tone: "warning",
        message: "This area is for school administrators. Sign in to view the audit log."
      });
      setLoading(false);
      return;
    }
    const [{ data: evs }, { data: stus }, { data: ops }] = await Promise.all([
      supabase
        .from("dismissal_events")
        .select(
          "event_id, request_id, student_id, scanned_by, approved_by, scan_time, approval_time, final_status, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("students").select("student_id, name, admission_no"),
      // Map operator UUIDs to login IDs (teachers + gate). No UUIDs rendered.
      supabase.from("users").select("user_id, login_id").in("role", ["teacher", "gate"])
    ]);
    const r = (evs ?? []) as LogRow[];
    setRows(r);

    const smap: Record<string, StudentLite> = {};
    for (const s of (stus ?? []) as { student_id: string; name: string; admission_no: string }[]) {
      smap[s.student_id] = { name: s.name, admission_no: s.admission_no };
    }
    setStudents(smap);

    const omap: Record<string, string> = {};
    for (const o of (ops ?? []) as { user_id: string; login_id: string | null }[]) {
      if (o.login_id) omap[o.user_id] = o.login_id;
    }
    setOperatorLogin(omap);
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
            message: "We couldn't load the audit log. Please try again shortly."
          });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const handleChange = useCallback(() => {
    refresh().catch(() => {});
  }, [refresh]);
  useTableChanges<LogRow>(supabase, "dismissal_events", "*", handleChange);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && (r.final_status ?? "OPEN") !== statusFilter)
        return false;
      if (!needle) return true;
      const s = r.student_id ? students[r.student_id] : null;
      return (
        (s?.name.toLowerCase().includes(needle) ?? false) ||
        (s ? `adm ${s.admission_no}`.includes(needle) : false)
      );
    });
  }, [rows, q, statusFilter, students]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [q, statusFilter]);

  const liveMeta = REALTIME_TONE[status$] ?? REALTIME_TONE.connecting;

  if (access) {
    return (
      <Page title="Activity">
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
      title="Activity"
      description="The immutable dismissal audit trail. Rows are written only by the trusted Edge Functions via the service role — no update or delete policy exists on this table, so the history cannot be altered from the portal."
      actions={
        <StatusBadge tone={liveMeta.tone} pulse={status$ === "live"}>
          {liveMeta.label}
        </StatusBadge>
      }
    >
      <Section title="Audit log">
        <Card>
          <CardHeader
            title="Dismissal events"
            description="Most recent first."
            action={
              <span className="text-sm text-muted-foreground tabular-nums">
                {filtered.length}
              </span>
            }
          />
          <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-end">
            <SearchField
              id="activity-search"
              label="Search"
              value={q}
              onChange={setQ}
              placeholder="Student name or admission number"
            />
            <div className="w-full sm:w-52">
              <label
                htmlFor="activity-status"
                className="text-label font-medium text-foreground"
              >
                Outcome
              </label>
              <Select
                id="activity-status"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as "all" | DismissalStatus)}
              >
                <option value="all">All outcomes</option>
                {DISMISSAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {dismissalStatusLabel(s)}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>

          <DataTable<LogRow>
            rowKey={(r) => r.event_id}
            loading={loading}
            rows={pageRows}
            empty={
              <EmptyState
                icon="history"
                title="No events recorded yet"
                description="Dismissal activity will appear here as it happens."
              />
            }
            columns={[
              {
                key: "student",
                header: "Student",
                render: (r) => {
                  const s = r.student_id ? students[r.student_id] : null;
                  return (
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {s?.name ?? "—"}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        ADM {s?.admission_no ?? "—"}
                      </span>
                    </div>
                  );
                }
              },
              {
                key: "final_status",
                header: "Outcome",
                render: (r) =>
                  r.final_status ? (
                    <StatusBadge tone={dismissalStatusTone(r.final_status)}>
                      {dismissalStatusLabel(r.final_status)}
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral">Open</StatusBadge>
                  )
              },
              {
                key: "scanned",
                header: "Scanned",
                render: (r) => (
                  <div className="flex flex-col">
                    <span className="text-muted-foreground tabular-nums">
                      {fmt(r.scan_time)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {r.scanned_by ? (operatorLogin[r.scanned_by] ?? "gate") : "—"}
                    </span>
                  </div>
                )
              },
              {
                key: "approved",
                header: "Approved",
                render: (r) => (
                  <div className="flex flex-col">
                    <span className="text-muted-foreground tabular-nums">
                      {fmt(r.approval_time)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {r.approved_by ? (operatorLogin[r.approved_by] ?? "teacher") : "—"}
                    </span>
                  </div>
                )
              },
              {
                key: "created",
                header: "Recorded",
                render: (r) => (
                  <span className="text-muted-foreground tabular-nums">
                    {fmt(r.created_at)}
                  </span>
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
