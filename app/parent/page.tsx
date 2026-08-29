"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { StatusPill } from "@/components/ui/StatusPill";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { TopNav } from "@/components/ui/TopNav";
import type { DismissalStatus } from "@/lib/dismissal/state";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { DismissalQr } from "@/lib/qr/generate";
import { useRealtimeStatus, useTableChanges } from "@/lib/realtime/subs";
import { cancelDismissal, createDismissalRequest } from "@/lib/dismissal/client";

const NAV_LINKS = [
  { label: "Dashboard", href: "/parent" },
  { label: "History", href: "/parent/history" },
  { label: "Profile", href: "/parent/profile" }
];

type StudentView = {
  name: string;
  admissionNo: string;
  className: string;
  section: string;
};

type RequestRow = {
  request_id: string;
  status: DismissalStatus;
  expires_at: string | null;
  student_id: string;
};

function useCountdown(expiresAt: Date | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  return useMemo(() => {
    if (!expiresAt) return "—";
    const ms = Math.max(0, expiresAt.getTime() - now);
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [expiresAt, now]);
}

function Eyebrow() {
  return (
    <span className="eyebrow">
      <i />
      01 / PARENT PORTAL{" "}
      <span className="ml-1 px-1.5 py-0.5 border border-line text-mono-xs">
        V0.1
      </span>
    </span>
  );
}

function WelcomeRow({ parentName }: { parentName: string }) {
  const now = new Date();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-end justify-between border-b border-line pb-6"
    >
      <div>
        <Eyebrow />
        <h2 className="font-display text-display-md uppercase text-bone mt-4">
          {parentName}
        </h2>
      </div>
      <div className="text-right">
        <MonoLabel size="sm" tone="muted">
          {now.toLocaleDateString("en-US", { weekday: "long" })}
        </MonoLabel>
        <p className="font-mono text-mono-md text-bone mt-1 tabular-nums">
          {now.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
          })}
        </p>
      </div>
    </motion.div>
  );
}

function StudentCard({
  student,
  status,
  onRequest,
  onCancel,
  requesting,
  cancelling,
  error,
  countdown,
  qrToken
}: {
  student: StudentView | null;
  status: DismissalStatus;
  onRequest: () => void;
  onCancel: () => void;
  requesting: boolean;
  cancelling: boolean;
  error: string | null;
  countdown: string;
  qrToken: string | null;
}) {
  const showQr = status === "REQUESTED" || status === "AWAITING_TEACHER";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
    >
      <Panel
        withTopBar
        topBar={
          <>
            <span>02 / STUDENT · ACTIVE</span>
            <span className="text-success">● LIVE</span>
          </>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 p-7">
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 hairline flex items-center justify-center text-accent">
              <Icon name="user" className="h-7 w-7" strokeWidth={1.4} />
            </div>
            <div className="flex-1 min-w-0">
              <MonoLabel size="sm" tone="muted">
                Student
              </MonoLabel>
              <h3 className="font-display text-3xl uppercase text-bone mt-1 leading-none">
                {student?.name ?? "—"}
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Spec label="GRADE" value={student?.section ?? "—"} />
                <Spec label="CLASS" value={student?.className ?? "—"} />
                <Spec label="ADM" value={student?.admissionNo ?? "—"} />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 min-w-[260px]">
            {showQr ? (
              <QrReveal
                status={status}
                countdown={countdown}
                qrToken={qrToken}
                cancelling={cancelling}
                onCancel={onCancel}
              />
            ) : (
              <>
                <PrimaryButton
                  onClick={onRequest}
                  disabled={requesting}
                  aria-label="Request dismissal"
                >
                  {requesting ? (
                    <>
                      <Icon name="timer" className="h-4 w-4" strokeWidth={2} />
                      Requesting…
                    </>
                  ) : (
                    <>
                      <Icon name="walk" className="h-4 w-4" strokeWidth={2} />
                      Request Dismissal
                    </>
                  )}
                </PrimaryButton>
                {error && (
                  <p className="text-mono-sm font-mono uppercase tracking-widest text-danger">
                    {error}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </Panel>
    </motion.div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="hairline bg-ink px-2.5 py-1 flex items-center gap-2">
      <MonoLabel size="xs" tone="muted">
        {label}
      </MonoLabel>
      <span className="font-mono text-mono-sm text-bone uppercase tracking-wider">
        {value}
      </span>
    </div>
  );
}

function QrReveal({
  status,
  countdown,
  qrToken,
  cancelling,
  onCancel
}: {
  status: DismissalStatus;
  countdown: string;
  qrToken: string | null;
  cancelling: boolean;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-stretch gap-4"
    >
      <div className="flex items-center justify-between">
        <StatusPill status={status} pulse />
        <MonoLabel size="sm" tone="muted">
          TTL {countdown}
        </MonoLabel>
      </div>

      <div className="relative bg-bone p-3">
        {/* Mono hairline corner brackets — matches the portal system. */}
        {[
          "top-0 left-0 border-t border-l",
          "top-0 right-0 border-t border-r",
          "bottom-0 left-0 border-b border-l",
          "bottom-0 right-0 border-b border-r"
        ].map((cls) => (
          <span
            key={cls}
            className={`absolute h-3 w-3 border-ink ${cls}`}
            style={{ borderWidth: 1.5 }}
          />
        ))}

        {qrToken ? (
          <div className="aspect-square w-full">
            <DismissalQr token={qrToken} />
          </div>
        ) : (
          <div
            className="h-44 w-full bg-ink"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, #F1E8DC 1.2px, transparent 1.4px)",
              backgroundSize: "8px 8px"
            }}
            role="img"
            aria-label="Single-use dismissal QR code"
          />
        )}

        {/* Scan line — blue, sweeps top to bottom. */}
        <div className="pointer-events-none absolute left-3 right-3 top-3 h-[2px] bg-accent shadow-accent-glow animate-scan" />
      </div>

      <div className="flex items-center justify-between text-mono-sm font-mono uppercase tracking-widest">
        <span className="text-muted">EXPIRES IN</span>
        <span className="text-bone tabular-nums">{countdown}</span>
      </div>

      {status === "REQUESTED" && (
        <button
          onClick={onCancel}
          disabled={cancelling}
          className="h-10 px-4 inline-flex items-center justify-center gap-2 hairline text-muted hover:text-danger hover:border-danger font-mono uppercase tracking-widest text-mono-xs transition-colors disabled:opacity-50"
        >
          {cancelling ? (
            <>
              <Icon name="timer" className="h-3.5 w-3.5" strokeWidth={2} />
              Cancelling…
            </>
          ) : (
            <>
              <Icon name="x" className="h-3.5 w-3.5" strokeWidth={2} />
              Cancel Request
            </>
          )}
        </button>
      )}
    </motion.div>
  );
}

function InfoGrid() {
  const items = [
    { icon: "car" as const, label: "Pickup Method", value: "Parent Pickup" },
    { icon: "user" as const, label: "Authorized", value: "Linked Guardian" },
    { icon: "history" as const, label: "Today", value: "— dismissals" },
    { icon: "settings" as const, label: "Class", value: "Tulip" }
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } }
      }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-line"
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          variants={{
            hidden: { opacity: 0, y: 16 },
            show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
          }}
          className="bg-panel p-6 group hover:bg-panel-alt transition-colors"
        >
          <div className="h-10 w-10 hairline flex items-center justify-center text-accent">
            <Icon name={item.icon} className="h-5 w-5" strokeWidth={1.4} />
          </div>
          <MonoLabel size="sm" tone="muted" className="mt-5 block">
            {item.label}
          </MonoLabel>
          <p className="font-display text-2xl uppercase text-bone mt-2 leading-none">
            {item.value}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-line pt-8 flex flex-wrap items-center justify-between gap-4">
      <MonoLabel size="xs" tone="muted">
        DISMISS / V0.1 / MIT — DISMISSFLOW EPS
      </MonoLabel>
      <div className="flex items-center gap-4">
        <MonoLabel size="xs" tone="muted">
          PUSH · REALTIME
        </MonoLabel>
        <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_10px_#B7EF42] animate-pulse-dot" />
      </div>
    </footer>
  );
}

export default function ParentDashboardPage() {
  const supabase = getSupabaseBrowserClient();
  const [parentName, setParentName] = useState("Parent");
  const [student, setStudent] = useState<StudentView | null>(null);
  const [activeRequest, setActiveRequest] = useState<RequestRow | null>(null);
  // Server-derived linked student id (from getSessionUser). The authoritative
  // identity for the active request — never hardcoded, never empty.
  const [linkedStudentId, setLinkedStudentId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authNote, setAuthNote] = useState<string | null>(null);

  const expiresAt = useMemo(
    () => (activeRequest?.expires_at ? new Date(activeRequest.expires_at) : null),
    [activeRequest]
  );
  const countdown = useCountdown(expiresAt);
  const status: DismissalStatus = activeRequest?.status ?? "IDLE";

  const status$ = useRealtimeStatus(supabase, "dismissal_requests");

  // Realtime handler — the server is the authority; the browser only reflects.
  // RLS already limits the stream to the linked student, but we still guard on
  // student_id so a mismatched/stale payload can't hijack the dashboard. Active
  // states (REQUESTED / AWAITING_TEACHER) replace the view; a final state only
  // updates the *same* request we're already tracking, so a historical row can
  // never take over. No client-side status decision is ever made here.
  const handleChange = useCallback((row: RequestRow) => {
    setActiveRequest((current) => {
      if (row.student_id && current && row.student_id !== current.student_id) {
        return current;
      }
      const isActive =
        row.status === "REQUESTED" || row.status === "AWAITING_TEACHER";
      if (isActive) return row;
      if (current && row.request_id === current.request_id) return row;
      return current ?? null;
    });
    // The QR is single-use and server-issued once; once the request leaves the
    // active window, clear it from memory (no trust placed in the payload).
    if (row.status !== "REQUESTED" && row.status !== "AWAITING_TEACHER") {
      setQrToken(null);
    }
  }, []);

  useTableChanges<RequestRow>(supabase, "dismissal_requests", "*", handleChange);

  // Load the real authenticated parent, their linked student, and any active
  // request on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) {
          setAuthNote("Sign in to request dismissal.");
          return;
        }

        const sessionUser = await getSessionUser(supabase);
        if (!sessionUser || sessionUser.role !== "parent") {
          setAuthNote("This portal is for parents only.");
          return;
        }
        const linkedStudentId = sessionUser.linkedStudentId;
        if (!linkedStudentId) {
          setAuthNote("No linked student for this account.");
          return;
        }
        setLinkedStudentId(linkedStudentId);
        if (user.email) setParentName(user.email);

        const { data: stu } = await supabase
          .from("students")
          .select("student_id, name, admission_no, class_id")
          .eq("student_id", linkedStudentId)
          .maybeSingle();

        let className = "Tulip";
        let section = "Nursery";
        if (stu?.class_id) {
          const { data: cls } = await supabase
            .from("classes")
            .select("class_name, section")
            .eq("class_id", stu.class_id)
            .maybeSingle();
          if (cls) {
            className = cls.class_name ?? className;
            section = cls.section ?? section;
          }
        }
        if (cancelled) return;
        if (stu) {
          setStudent({
            name: stu.name,
            admissionNo: stu.admission_no,
            className,
            section
          });
        }

        const { data: active } = await supabase
          .from("dismissal_requests")
          .select("request_id, status, expires_at, student_id")
          .eq("student_id", linkedStudentId)
          .in("status", ["REQUESTED", "AWAITING_TEACHER"])
          .maybeSingle();
        if (active && !cancelled) {
          setActiveRequest(active as RequestRow);
        }
      } catch {
        if (!cancelled) {
          setAuthNote(
            "Unable to load dismissal data. Supabase may not be configured."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleRequest() {
    if (requesting) return;
    setRequesting(true);
    setError(null);
    try {
      const data = await createDismissalRequest();
      // Re-fetch the authoritative row (RLS-scoped to the linked student) rather
      // than trusting a client-assembled object. This guarantees student_id is
      // the real, server-derived id so subsequent realtime updates from
      // gate/teacher match and are never ignored (Phase 8 bug).
      const { data: created } = await supabase
        .from("dismissal_requests")
        .select("request_id, status, expires_at, student_id")
        .eq("request_id", data.request_id)
        .maybeSingle();
      if (created) {
        setActiveRequest(created as RequestRow);
      } else if (linkedStudentId) {
        // Fallback: assemble from the server response + authoritative id.
        setActiveRequest({
          request_id: data.request_id,
          status: "REQUESTED",
          expires_at: data.expires_at,
          student_id: linkedStudentId
        });
      }
      setQrToken(data.token); // returned exactly once to this parent
    } catch (e) {
      const err = e as { code?: string; status?: number };
      if (err?.code === "CONFLICT" || err?.status === 409) {
        setError("An active dismissal request already exists for this student.");
      } else {
        setError("Could not create the dismissal request. Please try again.");
      }
    } finally {
      setRequesting(false);
    }
  }

  async function handleCancel() {
    if (!activeRequest || cancelling) return;
    setCancelling(true);
    setError(null);
    try {
      await cancelDismissal(activeRequest.request_id);
      // Realtime will also deliver the UPDATE; we set it optimistically so the
      // UI flips immediately.
      setActiveRequest({ ...activeRequest, status: "CANCELLED" });
      setQrToken(null);
    } catch (e) {
      const err = e as { code?: string; status?: number };
      if (err?.code === "REQUEST_NOT_CANCELLABLE" || err?.status === 409) {
        setError("This request can no longer be cancelled.");
      } else {
        setError("Could not cancel the request. Please try again.");
      }
    } finally {
      setCancelling(false);
    }
  }

  const isActive = status === "REQUESTED" || status === "AWAITING_TEACHER";

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
        <WelcomeRow parentName={parentName} />
        {authNote && (
          <div className="mt-10">
            <Panel withTopBar topBar={<span>00 / ACCESS</span>}>
              <div className="p-7 flex flex-col gap-5">
                <p className="font-mono text-mono-sm uppercase tracking-widest text-muted">
                  {authNote}
                </p>
                <Link
                  href="/login"
                  className="h-12 px-5 inline-flex items-center justify-center gap-3 bg-accent text-white font-mono uppercase tracking-widest text-mono-sm font-semibold shadow-accent-glow w-fit hover:-translate-y-0.5 hover:bg-accent-deep transition-all"
                >
                  <Icon name="arrow.right" className="h-4 w-4" strokeWidth={2} />
                  Sign In
                </Link>
              </div>
            </Panel>
          </div>
        )}
        {!authNote && (
          <div className="mt-10 grid gap-8">
            <StudentCard
              student={student}
              status={status}
              onRequest={handleRequest}
              onCancel={handleCancel}
              requesting={requesting}
              cancelling={cancelling}
              error={error}
              countdown={countdown}
              qrToken={isActive ? qrToken : null}
            />
            <InfoGrid />
            <Footer />
          </div>
        )}
      </main>
    </>
  );
}
