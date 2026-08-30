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
import { SearchField, AccessNote, Pager, StatTile } from "../_ui";

type ReqRow = {
  request_id: string;
  student_id: string;
  status: DismissalStatus;
  created_at: string;
  expires_at: string | null;
};
type StudentLite = { name: string; admission_no: string; class_name: string | null };
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

export default function AdminDismissalsPage() {
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [students, setStudents] = useState<Record<string, StudentLite>>({});
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<{
    tone: "info" | "warning";
    message: string;
  } | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DismissalStatus>("all");
  const [page, setPage] = useState(1);
  const status$ = useRealtimeStatus(supabase, "dismissal_requests");

  const refresh = useCallback(async () => {
    const su = await getSessionUser(supabase);
    if (!su || su.role !== "admin") {
      setAccess({
        tone: "warning",
        message: "This area is for school administrators. Sign in to monitor dismissals."
      });
      setLoading(false);
      return;
    }
    const [{ data: reqs }, { data: stus }, { data: cls }] = await Promise.all([
      supabase
        .from("dismissal_requests")
        .select("request_id, student_id, status, created_at, expires_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("students").select("student_id, name, admission_no, class_id"),
      supabase.from("classes").select("class_id, class_name")
    ]);
    const r = (reqs ?? []) as ReqRow[];
    setRows(r);

    const clsMap: Record<string, string> = {};
    for (const c of (cls ?? []) as { class_id: string; class_name: string }[]) {
      clsMap[c.class_id] = c.class_name;
    }
    const smap: Record<string, StudentLite> = {};
    for (const s of (stus ?? []) as {
      student_id: string;
      name: string;
      admission_no: string;
      class_id: string | null;
    }[]) {
      smap[s.student_id] = {
        name: s.name,
        admission_no: s.admission_no,
        class_name: s.class_id ? clsMap[s.class_id] ?? null : null
      };
    }
    setStudents(smap);
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
            message: "We couldn't load the monitor. Please try again shortly."
          });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Realtime: re-fetch on any change. Read/sync only — the browser never decides
  // or mutates dismissal state (the trusted Edge Functions do).
  const handleChange = useCallback(() => {
    refresh().catch(() => {});
  }, [refresh]);
  useTableChanges<ReqRow>(supabase, "dismissal_requests", "*", handleChange);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!needle) return true;
      const s = students[r.student_id];
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

  const tally: Record<string, number> = {};
  for (const r of rows) tally[r.status] = (tally[r.status] ?? 0) + 1;

  const liveMeta = REALTIME_TONE[status$] ?? REALTIME_TONE.connecting;

  if (access) {
    return (
      <Page title="Dismissals">
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
      title="Dismissals"
      description="All dismissal requests at your school, updated in real time. The Admin portal only observes state — every transition is performed by the trusted Edge Functions. No QR tokens or guardian details are shown here."
      actions={
        <StatusBadge tone={liveMeta.tone} pulse={status$ === "live"}>
          {liveMeta.label}
        </StatusBadge>
      }
    >
      <Section title="Status summary">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {DISMISSAL_STATUSES.map((s) => (
            <StatTile
              key={s}
              label={dismissalStatusLabel(s)}
              value={tally[s] ?? 0}
              accent={s === "AWAITING_TEACHER" || s === "REQUESTED"}
            />
          ))}
        </div>
      </Section>

      <Section title="Requests">
        <Card>
          <CardHeader
            title="Dismissal requests"
            description="Most recent first."
            action={
              <span className="text-sm text-muted-foreground tabular-nums">
                {filtered.length}
              </span>
            }
          />
          <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-end">
            <SearchField
              id="dismissals-search"
              label="Search"
              value={q}
              onChange={setQ}
              placeholder="Student name or admission number"
            />
            <div className="w-full sm:w-52">
              <label
                htmlFor="dismissals-status"
                className="text-label font-medium text-foreground"
              >
                Status
              </label>
              <Select
                id="dismissals-status"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as "all" | DismissalStatus)}
              >
                <option value="all">All statuses</option>
                {DISMISSAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {dismissalStatusLabel(s)}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>

          <DataTable<ReqRow>
            rowKey={(r) => r.request_id}
            loading={loading}
            rows={pageRows}
            empty={
              <EmptyState
                icon="activity"
                title="No dismissal requests"
                description="Requests will appear here as they are created."
              />
            }
            columns={[
              {
                key: "student",
                header: "Student",
                render: (r) => {
                  const s = students[r.student_id];
                  return (
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {s?.name ?? "—"}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        ADM {s?.admission_no ?? "—"}
                        {s?.class_name ? ` · ${s.class_name}` : ""}
                      </span>
                    </div>
                  );
                }
              },
              {
                key: "status",
                header: "Status",
                render: (r) => (
                  <StatusBadge tone={dismissalStatusTone(r.status)}>
                    {dismissalStatusLabel(r.status)}
                  </StatusBadge>
                )
              },
              {
                key: "created",
                header: "Created",
                render: (r) => (
                  <span className="text-muted-foreground tabular-nums">
                    {fmt(r.created_at)}
                  </span>
                )
              },
              {
                key: "expires",
                header: "Expires",
                render: (r) => (
                  <span className="text-muted-foreground tabular-nums">
                    {fmt(r.expires_at)}
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
