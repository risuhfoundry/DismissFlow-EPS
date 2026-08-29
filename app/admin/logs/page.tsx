"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { TopNav } from "@/components/ui/TopNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccessNote } from "@/components/ui/AccessNote";
import { LoadingState, EmptyState } from "@/components/ui/StateBlock";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRealtimeStatus } from "@/lib/realtime/subs";
import type { DismissalStatus } from "@/lib/dismissal/state";

const NAV_LINKS = [
  { label: "Overview", href: "/admin" },
  { label: "Roster", href: "/admin/roster" },
  { label: "Classes", href: "/admin/classes" },
  { label: "Users", href: "/admin/users" },
  { label: "Monitor", href: "/admin/monitor" },
  { label: "Logs", href: "/admin/logs" }
];

type LogRow = {
  event_id: string;
  request_id: string;
  student_id: string | null;
  scanned_by: string | null;
  approved_by: string | null;
  scan_time: string | null;
  approval_time: string | null;
  final_status: string | null;
  created_at: string;
};

type StudentLite = { name: string; admission_no: string };

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function AdminLogsPage() {
  const supabase = getSupabaseBrowserClient();
  const status$ = useRealtimeStatus(supabase, "dismissal_events");
  const [rows, setRows] = useState<LogRow[]>([]);
  const [students, setStudents] = useState<Record<string, StudentLite>>({});
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
          setAuthNote("Sign in at /login/admin to view the audit log.");
          setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from("dismissal_events")
          .select(
            "event_id, request_id, student_id, scanned_by, approved_by, scan_time, approval_time, final_status, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        if (cancelled) return;
        setRows((data ?? []) as LogRow[]);
        const studentIds = Array.from(
          new Set(
            (data ?? [])
              .map((r) => r.student_id)
              .filter((v): v is string => !!v)
          )
        );
        if (studentIds.length > 0) {
          const { data: stus } = await supabase
            .from("students")
            .select("student_id, name, admission_no")
            .in("student_id", studentIds);
          const map: Record<string, StudentLite> = {};
          for (const s of stus ?? []) {
            map[s.student_id] = { name: s.name, admission_no: s.admission_no };
          }
          if (!cancelled) setStudents(map);
        }
      } catch {
        if (!cancelled) setAuthNote("Could not load logs.");
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
        trailing={<StatusIndicator status={status$} />}
      />

      <main className="pt-24 pb-16 section-shell">
        <PageHeader
          eyebrow="04 / AUDIT LOG"
          title="Dismissal Events"
          description="Immutable audit trail. Rows are written only by the trusted Edge Functions via the service role; no UPDATE/DELETE policy exists on this table."
        />

        {authNote && (
          <div className="mt-8">
            <AccessNote message={authNote} signInHref="/login/admin" signInLabel="Sign In" />
          </div>
        )}

        {!authNote && (
          <div className="mt-10">
            <Panel
              withTopBar
              topBar={
                <>
                  <span>01 / RECENT EVENTS</span>
                  <span className="text-muted">LIMIT 100</span>
                </>
              }
            >
              {loading ? (
                <LoadingState message="Loading events…" />
              ) : rows.length === 0 ? (
                <EmptyState message="No events recorded yet." icon="history" />
              ) : (
                <ul className="divide-y divide-line">
                  {rows.map((r, idx) => {
                    const s = r.student_id ? students[r.student_id] : null;
                    return (
                      <motion.li
                        key={r.event_id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.4,
                          ease: [0.16, 1, 0.3, 1],
                          delay: idx * 0.02
                        }}
                        className="p-5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                            <MonoLabel size="xs" tone="muted">
                              EVENT {r.event_id.slice(0, 8).toUpperCase()}
                            </MonoLabel>
                            {r.final_status && (
                              <StatusPill status={r.final_status as DismissalStatus} />
                            )}
                          </div>
                          <p className="font-display text-xl uppercase text-bone leading-none">
                            {s?.name ?? "—"}
                          </p>
                          <div className="font-mono text-mono-xs uppercase tracking-widest text-muted flex flex-wrap gap-x-4 gap-y-1">
                            <span>ADM {s?.admission_no ?? "—"}</span>
                            {r.scan_time && <span>SCAN {formatTime(r.scan_time)}</span>}
                            {r.approval_time && (
                              <span>APPROVED {formatTime(r.approval_time)}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right font-mono text-mono-xs uppercase tracking-widest text-muted">
                          <p>CREATED {formatTime(r.created_at)}</p>
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
