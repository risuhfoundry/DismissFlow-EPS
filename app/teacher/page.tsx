"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { TopNav } from "@/components/ui/TopNav";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRealtimeStatus, useTableChanges } from "@/lib/realtime/subs";

const NAV_LINKS = [
  { label: "Queue", href: "/teacher" }
];

type QueueRow = {
  request_id: string;
  status: "AWAITING_TEACHER" | "REQUESTED" | "DISMISSED" | "REJECTED";
  created_at: string;
  student_id: string;
};

type StudentLite = { name: string; admission_no: string };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function TeacherQueuePage() {
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [students, setStudents] = useState<Record<string, StudentLite>>({});
  const [classMeta, setClassMeta] = useState<{ name: string; section: string }>({ name: "Tulip", section: "Nursery" });
  const [authNote, setAuthNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const status$ = useRealtimeStatus(supabase, "dismissal_requests");

  // Load teacher context + initial AWAITING_TEACHER queue.
  useEffect(() => {
    let cancelled = false;
    (async () => {
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
          if (!cancelled) {
            setClassMeta({
              name: cls.class_name ?? "Tulip",
              section: cls.section ?? "Nursery"
            });
          }
        }
        const { data: queue, error: qErr } = await supabase
          .from("dismissal_requests")
          .select("request_id, status, created_at, student_id")
          .eq("status", "AWAITING_TEACHER")
          .order("created_at", { ascending: true })
          .limit(50);
        if (qErr) throw qErr;
        if (cancelled) return;
        setRows((queue ?? []) as QueueRow[]);
        // Hydrate the students we know about.
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
          if (!cancelled) setStudents(map);
        }
      } catch {
        if (!cancelled) setAuthNote("Could not load the queue.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Live updates: re-fetch the relevant student row when a new request comes
  // in for the assigned class. RLS already limits the stream to the class.
  const handleChange = useCallback(async (row: QueueRow) => {
    setRows((current) => {
      const next = current.filter((r) => r.request_id !== row.request_id);
      if (row.status === "AWAITING_TEACHER") {
        next.push(row);
        next.sort((a, b) => a.created_at.localeCompare(b.created_at));
      }
      return next;
    });
    if (row.student_id && !students[row.student_id]) {
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
  }, [supabase, students]);

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
        <span className="eyebrow">
          <i />
          03 / TEACHER QUEUE
        </span>
        <h2 className="font-display text-display-md uppercase text-bone mt-4">
          {classMeta.name}
        </h2>
        <p className="text-muted mt-3 max-w-2xl">
          Live pickup requests for your assigned class. The list updates in
          real time when a gate scan arrives — no refresh required.
        </p>

        {authNote && (
          <div className="mt-8">
            <Panel withTopBar topBar={<span>00 / ACCESS</span>}>
              <div className="p-7 flex flex-col gap-5">
                <p className="font-mono text-mono-sm uppercase tracking-widest text-muted">
                  {authNote}
                </p>
                <Link
                  href="/login/teacher"
                  className="h-12 px-5 inline-flex items-center gap-3 bg-accent text-white font-mono uppercase tracking-widest text-mono-sm font-semibold shadow-accent-glow w-fit"
                >
                  <Icon name="arrow.right" className="h-4 w-4" strokeWidth={2} />
                  Sign In
                </Link>
              </div>
            </Panel>
          </div>
        )}

        {!authNote && (
          <div className="mt-10">
            <Panel
              withTopBar
              topBar={
                <>
                  <span>01 / PENDING PICKUPS</span>
                  <span className="text-success">● LIVE</span>
                </>
              }
            >
              {loading ? (
                <div className="p-10 flex items-center justify-center">
                  <Icon name="timer" className="h-5 w-5 text-muted" />
                </div>
              ) : rows.length === 0 ? (
                <div className="p-10 text-muted text-center">
                  <MonoLabel size="sm" tone="muted">
                    NO PENDING PICKUPS
                  </MonoLabel>
                </div>
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
                              SCANNED {formatTime(r.created_at)}
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
                            <Icon
                              name="arrow.right"
                              className="h-4 w-4 text-muted"
                              strokeWidth={2}
                            />
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
