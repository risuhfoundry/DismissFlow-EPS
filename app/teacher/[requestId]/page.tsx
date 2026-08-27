"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { StatusPill } from "@/components/ui/StatusPill";
import { TopNav } from "@/components/ui/TopNav";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth/session";
import { approveDismissal, rejectDismissal } from "@/lib/dismissal/client";
import { useTableChanges } from "@/lib/realtime/subs";
import type { DismissalStatus } from "@/lib/dismissal/state";

const NAV_LINKS = [{ label: "Queue", href: "/teacher" }];

type RequestRow = {
  request_id: string;
  student_id: string;
  status: DismissalStatus;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

type StudentRow = {
  student_id: string;
  name: string;
  admission_no: string;
  class_id: string;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function TeacherDetailPage() {
  const params = useParams<{ requestId: string }>();
  const requestId = params?.requestId as string;
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [request, setRequest] = useState<RequestRow | null>(null);
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [guardian, setGuardian] = useState<{ name: string; phone: string | null } | null>(null);
  const [scanTime, setScanTime] = useState<string | null>(null);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const [acting, setActing] = useState<"approve" | "reject" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Live updates for the request itself.
  const handleChange = useCallback((row: RequestRow) => {
    if (row.request_id !== requestId) return;
    setRequest((current) => (current ? { ...current, ...row } : (row as RequestRow)));
  }, [requestId]);
  useTableChanges<RequestRow>(supabase, "dismissal_requests", "*", handleChange);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessionUser = await getSessionUser(supabase);
        if (!sessionUser || sessionUser.role !== "teacher") {
          setAuthNote("Sign in as a teacher to view pickup details.");
          return;
        }
        const { data: r, error: rErr } = await supabase
          .from("dismissal_requests")
          .select("request_id, student_id, status, created_at, updated_at, expires_at")
          .eq("request_id", requestId)
          .maybeSingle();
        if (rErr) throw rErr;
        if (!r) {
          setAuthNote("This request was not found.");
          return;
        }
        if (cancelled) return;
        setRequest(r as RequestRow);

        const { data: stu } = await supabase
          .from("students")
          .select("student_id, name, admission_no, class_id")
          .eq("student_id", r.student_id)
          .maybeSingle();
        if (stu && !cancelled) setStudent(stu as StudentRow);

        // Best-effort guardian name + scan time (server-side RLS decides what
        // is readable; the teacher of the class can see linked guardians).
        const { data: sg } = await supabase
          .from("student_guardians")
          .select("guardian_id")
          .eq("student_id", r.student_id)
          .limit(1)
          .maybeSingle();
        if (sg) {
          const { data: gd } = await supabase
            .from("guardians")
            .select("name, phone")
            .eq("guardian_id", sg.guardian_id)
            .maybeSingle();
          if (gd && !cancelled) setGuardian({ name: gd.name, phone: gd.phone });
        }
        const { data: ev } = await supabase
          .from("dismissal_events")
          .select("scan_time")
          .eq("request_id", requestId)
          .maybeSingle();
        if (ev?.scan_time && !cancelled) setScanTime(ev.scan_time);
      } catch {
        if (!cancelled) setAuthNote("Could not load pickup details.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, requestId]);

  async function handleApprove() {
    if (!request || acting) return;
    setActing("approve");
    setActionError(null);
    try {
      await approveDismissal(request.request_id);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setActionError(err.message ?? "Could not approve dismissal.");
    } finally {
      setActing(null);
    }
  }

  async function handleReject() {
    if (!request || acting) return;
    setActing("reject");
    setActionError(null);
    try {
      await rejectDismissal(request.request_id);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setActionError(err.message ?? "Could not reject dismissal.");
    } finally {
      setActing(null);
    }
  }

  const decided = request?.status === "DISMISSED" || request?.status === "REJECTED";

  return (
    <>
      <TopNav
        links={NAV_LINKS}
        trailing={
          <Link
            href="/teacher"
            className="font-mono uppercase tracking-widest text-mono-xs text-muted hover:text-bone transition-colors"
          >
            ← Back to queue
          </Link>
        }
      />

      <main className="pt-24 pb-16 section-shell max-w-3xl">
        <span className="eyebrow">
          <i />
          04 / PICKUP DETAIL
        </span>
        <h2 className="font-display text-display-md uppercase text-bone mt-4">
          {student?.name ?? "—"}
        </h2>
        <p className="text-muted mt-2 font-mono text-mono-sm uppercase tracking-widest">
          ADM {student?.admission_no ?? "—"}
        </p>

        {authNote && (
          <div className="mt-8">
            <Panel withTopBar topBar={<span>00 / ACCESS</span>}>
              <div className="p-7 font-mono text-mono-sm uppercase tracking-widest text-muted">
                {authNote}
              </div>
            </Panel>
          </div>
        )}

        {!authNote && request && (
          <div className="mt-10 grid gap-6">
            <Panel withTopBar topBar={<span>01 / STATE</span>}>
              <div className="p-7 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <MonoLabel size="xs" tone="muted">REQUEST STATUS</MonoLabel>
                  <StatusPill status={request.status} pulse={!decided} />
                </div>
                <div className="text-right font-mono text-mono-xs uppercase tracking-widest text-muted">
                  <p>REQUESTED {formatTime(request.created_at)}</p>
                  {scanTime && <p>SCANNED {formatTime(scanTime)}</p>}
                </div>
              </div>
            </Panel>

            {guardian && (
              <Panel withTopBar topBar={<span>02 / GUARDIAN</span>}>
                <dl className="p-7 grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-y-4 gap-x-6 font-mono">
                  <MonoLabel size="xs" tone="muted">NAME</MonoLabel>
                  <span className="text-mono-sm text-bone uppercase tracking-wider">
                    {guardian.name}
                  </span>
                  <MonoLabel size="xs" tone="muted">PHONE</MonoLabel>
                  <span className="text-mono-sm text-bone uppercase tracking-wider tabular-nums">
                    {guardian.phone ?? "—"}
                  </span>
                </dl>
              </Panel>
            )}

            <Panel withTopBar topBar={<span>03 / DECISION</span>}>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="p-7 flex flex-col gap-5"
              >
                {decided ? (
                  <p className="font-mono text-mono-sm uppercase tracking-widest text-muted">
                    This request has been decided. The parent has been notified in real time.
                  </p>
                ) : (
                  <>
                    <p className="font-mono text-mono-sm uppercase tracking-widest text-muted">
                      You are the final authority. A QR alone never releases a student.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <PrimaryButton
                        onClick={handleApprove}
                        disabled={acting !== null}
                        aria-label="Approve dismissal"
                      >
                        {acting === "approve" ? (
                          <>
                            <Icon name="timer" className="h-4 w-4" strokeWidth={2} />
                            Approving…
                          </>
                        ) : (
                          <>
                            <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
                            Approve & Dismiss
                          </>
                        )}
                      </PrimaryButton>
                      <button
                        onClick={handleReject}
                        disabled={acting !== null}
                        className="h-12 px-5 inline-flex items-center gap-3 hairline text-danger hover:bg-danger hover:text-white font-mono uppercase tracking-widest text-mono-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {acting === "reject" ? (
                          <>
                            <Icon name="timer" className="h-4 w-4" strokeWidth={2} />
                            Rejecting…
                          </>
                        ) : (
                          <>
                            <Icon name="x" className="h-4 w-4" strokeWidth={2.4} />
                            Reject
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
                {actionError && (
                  <p className="font-mono text-mono-sm uppercase tracking-widest text-danger">
                    {actionError}
                  </p>
                )}
                <button
                  onClick={() => router.push("/teacher")}
                  className="self-start h-10 px-4 inline-flex items-center gap-2 hairline text-muted hover:text-bone font-mono uppercase tracking-widest text-mono-xs transition-colors"
                >
                  <Icon name="arrow.right" className="h-3.5 w-3.5 rotate-180" strokeWidth={2} />
                  Back to queue
                </button>
              </motion.div>
            </Panel>
          </div>
        )}
      </main>
    </>
  );
}
