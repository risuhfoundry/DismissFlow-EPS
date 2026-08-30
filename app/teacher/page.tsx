"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { TopNav } from "@/components/ui/TopNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccessNote } from "@/components/ui/AccessNote";
import { LoadingState, EmptyState } from "@/components/ui/StateBlock";
import { GhostButton } from "@/components/ui/Button";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRealtimeStatus, useTableChanges } from "@/lib/realtime/subs";

const NAV_LINKS = [{ label: "Queue", href: "/teacher" }];

type QueueRow = {
  request_id: string;
  status: "AWAITING_TEACHER" | "REQUESTED" | "DISMISSED" | "REJECTED";
  created_at: string;
  student_id: string;
};

type StudentLite = { name: string; admission_no: string };

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

// How long the request has been waiting on the teacher (request age).
function ageLabel(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "JUST NOW";
  if (mins < 60) return mins + "M AGO";
  return Math.floor(mins / 60) + "H " + (mins % 60) + "M AGO";
}

export default function TeacherQueuePage() {
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [students, setStudents] = useState<Record<string, StudentLite>>({});
  // Mirror of `students` for use inside the realtime handler. Reading `students`
  // directly would force the handler (and the useTableChanges subscription) to
  // be recreated whenever the map changes — thrashing the realtime channel and
  // opening a window where dismissal events are missed. The ref is kept in sync
  // via the effect below so the handler can stay stable (deps: [supabase]).
  const studentsRef = useRef<Record<string, StudentLite>>({});
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);
  const [classMeta, setClassMeta] = useState<{ name: string; section: string }>({ name: "", section: "" });
  const [authNote, setAuthNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const status$ = useRealtimeStatus(supabase, "dismissal_requests");

  const loadQueue = useCallback(async () => {
    setRefreshing(true);
    try {
      const sessionUser = await getSessionUser(supabase);
      if (!sessionUser || sessionUser.role !== "teacher" || !sessionUser.assignedClassId) {
        setAuthNote("Sign in as a teacher to view the pickup queue.");
        setLoading(false);
        return;
      }
      const { data: cls } = await supabase
        .from("classes")
        .select("class_name, section")
        .eq("class_id", sessionUser.assignedClassId)
        .maybeSingle();
      if (cls) {
        setClassMeta({
          name: cls.class_name ?? "",
          section: cls.section ?? ""
        });
      }
      const { data: queue, error: qErr } = await supabase
        .from("dismissal_requests")
        .select("request_id, status, created_at, student_id")
        .eq("status", "AWAITING_TEACHER")
        .order("created_at", { ascending: true })
        .limit(50);
      if (qErr) throw qErr;
      setRows((queue ?? []) as QueueRow[]);
      const studentIds = Array.from(new Set((queue ?? []).map((r) => r.student_id)));
      if (studentIds.length > 0) {
        const { data: stus } = await supabase
          .from("students")
          .select("student_id, name, admission_no, class_id")
          .in("student_id", studentIds);
        const map: Record<string, StudentLite> = {};
        for (const s of stus ?? []) {
          map[s.student_id] = { name: s.name, admission_no: s.admission_no };
        }
        setStudents(map);
      }
      setAuthNote(null);
    } catch {
      setAuthNote("Could not load the queue.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleChange = useCallback(
    async (row: QueueRow) => {
      setRows((current) => {
        const next = current.filter((r) => r.request_id !== row.request_id);
        if (row.status === "AWAITING_TEACHER") {
          next.push(row);
          next.sort((a, b) => a.created_at.localeCompare(b.created_at));
        }
        return next;
      });
      // Read the latest student map from the ref (not closure state) so this
      // handler stays stable and the realtime subscription is never re-created.
      if (row.student_id && !studentsRef.current[row.student_id]) {
        const { data: stu } = await supabase
          .from("students")
          .select("student_id, name, admission_no")
          .eq("student_id", row.student_id)
          .maybeSingle();
        if (stu) {
          setStudents((m) => ({
            ...m,
            [stu.student_id]: { name: stu.name, admission_no: stu.admission_no }
          }));
        }
      }
    },
    [supabase]
  );

  useTableChanges<QueueRow>(supabase, "dismissal_requests", "*", handleChange);

  return (
    <>
      <TopNav
        links={NAV_LINKS}
        trailing={
          <div className="hidden md:flex items-center gap-2">
            <StatusIndicator status={status$} />
          </div>
        }
      />

      <main className="pt-24 pb-16 section-shell">
        <PageHeader
          eyebrow="03 / TEACHER QUEUE"
          title={classMeta.name || "Your Class"}
          description="Live pickup requests for your assigned class. The list updates in real time when a gate scan arrives — no refresh required."
        />

        {authNote && (
          <div className="mt-8">
            <AccessNote message={authNote} signInHref="/login/teacher" signInLabel="Sign In" />
          </div>
        )}

        {!authNote && (
          <div className="mt-8">
            <Panel
              withTopBar
              topBar={
                <>
                  <span>01 / PENDING PICKUPS</span>
                  <span className="flex items-center gap-3">
                    <span className="text-success flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_#B7EF42] animate-pulse-dot" />
                      LIVE
                    </span>
                    <GhostButton
                      onClick={() => loadQueue()}
                      disabled={refreshing}
                      aria-label="Refresh pickup queue"
                    >
                      <Icon name={refreshing ? "timer" : "arrow.right"} className="h-3.5 w-3.5" strokeWidth={2} />
                      {refreshing ? "Refreshing" : "Refresh"}
                    </GhostButton>
                  </span>
                </>
              }
            >
              {loading ? (
                <LoadingState message="Loading queue…" />
              ) : rows.length === 0 ? (
                <EmptyState message="No pending pickups." icon="scan" />
              ) : (
                <ul className="divide-y divide-line">
                  {rows.map((r, idx) => {
                    const s = students[r.student_id];
                    return (
                      <motion.li
                        key={r.request_id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.4,
                          ease: [0.16, 1, 0.3, 1],
                          delay: idx * 0.04
                        }}
                      >
                        <Link
                          href={`/teacher/${r.request_id}`}
                          className="p-5 flex items-center justify-between gap-4 hover:bg-panel-alt transition-colors"
                        >
                          <div className="flex flex-col gap-1">
                            <MonoLabel size="xs" tone="muted">
                              SCANNED {clockTime(r.created_at)} · WAITED {ageLabel(r.created_at)}
                            </MonoLabel>
                            <p className="font-display text-2xl uppercase text-bone leading-none">
                              {s?.name ?? "Loading…"}
                            </p>
                            <p className="font-mono text-mono-sm text-muted uppercase tracking-wider">
                              ADM {s?.admission_no ?? "—"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <MonoLabel size="xs" tone="accent">
                              AWAITING DECISION
                            </MonoLabel>
                            <Icon name="arrow.right" className="h-4 w-4 text-muted" strokeWidth={2} />
                          </div>
                        </Link>
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
