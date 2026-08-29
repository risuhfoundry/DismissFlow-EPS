"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { StatusPill } from "@/components/ui/StatusPill";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { TopNav } from "@/components/ui/TopNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccessNote } from "@/components/ui/AccessNote";
import { LoadingState, EmptyState } from "@/components/ui/StateBlock";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRealtimeStatus, useTableChanges } from "@/lib/realtime/subs";
import type { DismissalStatus } from "@/lib/dismissal/state";

const NAV_LINKS = [
  { label: "Overview", href: "/admin" },
  { label: "Roster", href: "/admin/roster" },
  { label: "Classes", href: "/admin/classes" },
  { label: "Users", href: "/admin/users" },
  { label: "Monitor", href: "/admin/monitor" },
  { label: "Logs", href: "/admin/logs" }
];

type ReqRow = {
  request_id: string;
  student_id: string;
  status: DismissalStatus;
  created_at: string;
  expires_at: string | null;
};
type EvRow = {
  request_id: string;
  scanned_by: string | null;
  approved_by: string | null;
  scan_time: string | null;
  approval_time: string | null;
  final_status: string | null;
};
type StudentLite = { name: string; admission_no: string; class_name: string | null };

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function AdminMonitorPage() {
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [students, setStudents] = useState<Record<string, StudentLite>>({});
  const [events, setEvents] = useState<Record<string, EvRow>>({});
  const [teachers, setTeachers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const status$ = useRealtimeStatus(supabase, "dismissal_requests");

  const refresh = useCallback(async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setAuthNote("Sign in at /login/admin to monitor dismissals.");
      setLoading(false);
      return;
    }
    const [{ data: reqs }, { data: evs }, { data: stus }, { data: cls }, { data: tch }] =
      await Promise.all([
        supabase
          .from("dismissal_requests")
          .select("request_id, student_id, status, created_at, expires_at")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("dismissal_events")
          .select("request_id, scanned_by, approved_by, scan_time, approval_time, final_status"),
        supabase.from("students").select("student_id, name, admission_no, class_id"),
        supabase.from("classes").select("class_id, class_name"),
        supabase.from("users").select("user_id, login_id").eq("role", "teacher")
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

    const emap: Record<string, EvRow> = {};
    for (const e of (evs ?? []) as EvRow[]) emap[e.request_id] = e;
    setEvents(emap);

    const tmap: Record<string, string> = {};
    for (const t of (tch ?? []) as { user_id: string; login_id: string | null }[]) {
      if (t.login_id) tmap[t.user_id] = t.login_id;
    }
    setTeachers(tmap);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch {
        if (!cancelled) setAuthNote("Could not load the monitor.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Realtime: re-fetch on any change to the operational tables. Read/sync only
  // — the browser never decides or mutates dismissal state (Edge Functions do).
  const onReqChange = useCallback(() => {
    refresh().catch(() => {});
  }, [refresh]);
  const onEvChange = useCallback(() => {
    refresh().catch(() => {});
  }, [refresh]);
  useTableChanges<ReqRow>(supabase, "dismissal_requests", "*", onReqChange);
  useTableChanges<EvRow>(supabase, "dismissal_events", "*", onEvChange);

  // Live status tally (derived from the rows we already hold — no extra query).
  const tally: Record<string, number> = {};
  for (const r of rows) tally[r.status] = (tally[r.status] ?? 0) + 1;

  return (
    <>
      <TopNav links={NAV_LINKS} trailing={<StatusIndicator status={status$} />} />

      <main className="pt-24 pb-16 section-shell">
        <PageHeader
          eyebrow="04 / DISMISSAL MONITOR"
          title="Live Operations"
          description="All dismissal requests, updated in real time. The Admin portal only observes state — every transition is performed by the trusted Edge Functions. No QR token or guardian PII is shown here."
        />

        {authNote && (
          <div className="mt-8">
            <AccessNote message={authNote} signInHref="/login/admin" signInLabel="Sign In" />
          </div>
        )}

        {!authNote && (
          <div className="mt-10 grid gap-8">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-px bg-line">
              {(
                ["REQUESTED", "AWAITING_TEACHER", "DISMISSED", "REJECTED", "CANCELLED", "EXPIRED"] as DismissalStatus[]
              ).map((s) => (
                <Stat
                  key={s}
                  label={s.replace(/_/g, " ")}
                  value={tally[s] ?? 0}
                />
              ))}
              <Stat label="TOTAL" value={rows.length} />
            </div>

            <Panel
              withTopBar
              topBar={
                <>
                  <span>01 / REQUESTS</span>
                  <Link
                    href="/admin/logs"
                    className="font-mono uppercase tracking-widest text-mono-xs text-accent hover:text-bone transition-colors"
                  >
                    AUDIT LOG →
                  </Link>
                </>
              }
            >
              {loading ? (
                <LoadingState message="Loading monitor…" />
              ) : rows.length === 0 ? (
                <EmptyState message="No dismissal requests yet." icon="history" />
              ) : (
                <ul className="divide-y divide-line">
                  {rows.map((r, idx) => {
                    const s = students[r.student_id];
                    const ev = events[r.request_id];
                    return (
                      <motion.li
                        key={r.request_id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: idx * 0.015 }}
                        className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4"
                      >
                        <div className="flex flex-col gap-2 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <p className="font-display text-xl uppercase text-bone leading-none truncate">
                              {s?.name ?? "—"}
                            </p>
                            <StatusPill status={r.status} />
                          </div>
                          <div className="font-mono text-mono-xs uppercase tracking-widest text-muted flex flex-wrap gap-x-4 gap-y-1">
                            <span>ADM {s?.admission_no ?? "—"}</span>
                            {s?.class_name && <span>{s.class_name.toUpperCase()}</span>}
                            <span>CREATED {fmt(r.created_at)}</span>
                            {r.expires_at && <span>EXPIRES {fmt(r.expires_at)}</span>}
                          </div>
                          {ev && (
                            <div className="font-mono text-mono-xs uppercase tracking-widest text-muted flex flex-wrap gap-x-4 gap-y-1 mt-1">
                              {ev.scanned_by && <span>SCANNED BY {ev.scanned_by}</span>}
                              {ev.scan_time && <span>SCAN {fmt(ev.scan_time)}</span>}
                              {ev.approved_by && (
                                <span>APPROVED BY {teachers[ev.approved_by] ?? "teacher"}</span>
                              )}
                              {ev.approval_time && <span>APPROVAL {fmt(ev.approval_time)}</span>}
                            </div>
                          )}
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        )}
      </main>
    </>
  );
}
