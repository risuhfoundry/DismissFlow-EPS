"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { TopNav } from "@/components/ui/TopNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccessNote } from "@/components/ui/AccessNote";
import { Field, DefinitionList } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { PrimaryButton, DangerButton, DangerOutlineButton, GhostButton } from "@/components/ui/Button";
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
  class_name?: string | null;
};

type GuardianRow = { name: string; phone: string | null };

function clockTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function describeDecisionError(
  code: string,
  fallback: string
): { title: string; detail: string; action: string } {
  if (code === "UNAUTHENTICATED" || code.startsWith("UNAUTHORIZED")) {
    return {
      title: "Session Expired",
      detail: "Your teacher session is no longer valid.",
      action: "Sign in again at /login/teacher."
    };
  }
  switch (code) {
    case "TEACHER_REQUIRED":
    case "FORBIDDEN":
      return {
        title: "Not Authorized",
        detail: "This account is not a teacher account.",
        action: "Sign in with a teacher account."
      };
    case "TEACHER_CLASS_FORBIDDEN":
      return {
        title: "Wrong Class",
        detail: "This request belongs to another class.",
        action: "Only your assigned class's requests can be decided."
      };
    case "REQUEST_NOT_FOUND":
      return {
        title: "Not Found",
        detail: "This request is no longer available.",
        action: "Return to the queue."
      };
    case "REQUEST_NOT_AWAITING_TEACHER":
      return {
        title: "Already Decided",
        detail: "Another teacher already handled this request.",
        action: "Return to the queue."
      };
    case "INVALID_DECISION":
    case "INVALID_REQUEST":
      return {
        title: "Invalid Request",
        detail: "The request reference was invalid.",
        action: "Return to the queue and try again."
      };
    default:
      return {
        title: "Action Failed",
        detail: fallback || "The decision could not be completed.",
        action: "Try again in a moment."
      };
  }
}

export default function TeacherDetailPage() {
  const params = useParams<{ requestId: string }>();
  const requestId = params?.requestId as string;
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [request, setRequest] = useState<RequestRow | null>(null);
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [guardian, setGuardian] = useState<GuardianRow | null>(null);
  const [scanTime, setScanTime] = useState<string | null>(null);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const [acting, setActing] = useState<"approve" | "reject" | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleChange = useCallback(
    (row: RequestRow) => {
      if (row.request_id !== requestId) return;
      setRequest((current) =>
        current ? { ...current, ...row } : (row as RequestRow)
      );
    },
    [requestId]
  );
  useTableChanges<RequestRow>(supabase, "dismissal_requests", "*", handleChange);

  const loadRequest = useCallback(async () => {
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
      setRequest(r as RequestRow);

      const { data: stu } = await supabase
        .from("students")
        .select("student_id, name, admission_no, class_id")
        .eq("student_id", r.student_id)
        .maybeSingle();
      if (stu) {
        const next = stu as StudentRow;
        const { data: cls } = await supabase
          .from("classes")
          .select("class_name")
          .eq("class_id", (stu as StudentRow).class_id)
          .maybeSingle();
        if (cls) next.class_name = cls.class_name;
        setStudent(next);
      }

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
        if (gd) setGuardian({ name: gd.name, phone: gd.phone });
      }
      const { data: ev } = await supabase
        .from("dismissal_events")
        .select("scan_time")
        .eq("request_id", requestId)
        .maybeSingle();
      if (ev?.scan_time) setScanTime(ev.scan_time);
    } catch {
      setAuthNote("Could not load pickup details.");
    }
  }, [supabase, requestId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadRequest();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRequest]);

  async function runDecision(kind: "approve" | "reject") {
    if (!request || acting) return;
    setActing(kind);
    setActionError(null);
    try {
      if (kind === "approve") {
        await approveDismissal(request.request_id);
      } else {
        await rejectDismissal(request.request_id);
      }
      setConfirmReject(false);
      await loadRequest();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === "REQUEST_NOT_AWAITING_TEACHER") {
        await loadRequest();
        setActionError("This request was already handled by another teacher.");
      } else {
        const g = describeDecisionError(
          err.code ?? "",
          err.message ?? "Could not complete the decision."
        );
        setActionError(g.title + " — " + g.detail);
      }
    } finally {
      setActing(null);
    }
  }

  const decided =
    request?.status === "DISMISSED" ||
    request?.status === "REJECTED" ||
    request?.status === "CANCELLED";

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
        <PageHeader
          eyebrow="04 / PICKUP DETAIL"
          title={student?.name ?? "—"}
          description={
            <span className="font-mono uppercase tracking-widest text-mono-sm">
              ADM {student?.admission_no ?? "—"}
              {student?.class_name ? (
                <>
                  {" "}
                  <span className="text-line">/</span> {student.class_name}
                </>
              ) : null}
            </span>
          }
        />

        {authNote && (
          <div className="mt-8">
            <AccessNote message={authNote} signInHref="/login/teacher" signInLabel="Sign In" />
          </div>
        )}

        {!authNote && request && (
          <div className="mt-8 grid gap-6">
            <Panel withTopBar topBar={<span>01 / STATE</span>}>
              <DefinitionList>
                <Field label="REQUEST STATUS">
                  <StatusPill status={request.status} pulse={!decided} />
                </Field>
                <Field label="REQUESTED">
                  <span className="font-mono text-mono-sm uppercase tracking-wider">
                    {clockTime(request.created_at)}
                  </span>
                </Field>
                {scanTime && (
                  <Field label="SCANNED">
                    <span className="font-mono text-mono-sm uppercase tracking-wider">
                      {clockTime(scanTime)}
                    </span>
                  </Field>
                )}
              </DefinitionList>
            </Panel>

            {guardian && (
              <Panel withTopBar topBar={<span>02 / GUARDIAN</span>}>
                <DefinitionList>
                  <Field label="NAME">
                    <span className="font-mono text-mono-sm uppercase tracking-wider">
                      {guardian.name}
                    </span>
                  </Field>
                  <Field label="PHONE">
                    <span className="font-mono text-mono-sm uppercase tracking-wider tabular-nums">
                      {guardian.phone ?? "—"}
                    </span>
                  </Field>
                </DefinitionList>
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
                  <div
                    className={`flex items-center gap-3 font-mono uppercase tracking-widest text-mono-sm border px-4 py-3 ${
                      request.status === "DISMISSED"
                        ? "text-success border-success/40"
                        : "text-danger border-danger/40"
                    }`}
                  >
                    <Icon
                      name={request.status === "DISMISSED" ? "check" : "x"}
                      className="h-5 w-5"
                      strokeWidth={2.2}
                    />
                    {request.status === "DISMISSED"
                      ? "Student dismissed. The parent has been notified in real time."
                      : "Request rejected. The parent has been notified in real time."}
                  </div>
                ) : confirmReject ? (
                  <>
                    <p className="font-mono text-mono-sm uppercase tracking-widest text-danger">
                      Confirm rejection?
                    </p>
                    <p className="font-mono text-mono-xs uppercase tracking-widest text-muted">
                      The student will not be released. The parent is notified.
                      This cannot be undone.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <DangerButton
                        onClick={() => runDecision("reject")}
                        disabled={acting !== null}
                        loading={acting === "reject"}
                      >
                        <Icon name="x" className="h-4 w-4" strokeWidth={2.4} />
                        Confirm Reject
                      </DangerButton>
                      <GhostButton onClick={() => setConfirmReject(false)} disabled={acting !== null}>
                        Cancel
                      </GhostButton>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-mono text-mono-sm uppercase tracking-widest text-muted">
                      You are the final authority. A QR alone never releases a
                      student.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <PrimaryButton
                        onClick={() => runDecision("approve")}
                        disabled={acting !== null}
                        loading={acting === "approve"}
                        aria-label="Approve dismissal"
                      >
                        <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
                        Approve &amp; Dismiss
                      </PrimaryButton>
                      <DangerOutlineButton
                        onClick={() => setConfirmReject(true)}
                        disabled={acting !== null}
                      >
                        <Icon name="x" className="h-4 w-4" strokeWidth={2.4} />
                        Reject
                      </DangerOutlineButton>
                    </div>
                  </>
                )}

                {actionError && <Alert tone="danger">{actionError}</Alert>}

                {!decided && (
                  <GhostButton
                    onClick={() => router.push("/teacher")}
                    className="self-start"
                  >
                    <Icon name="arrow.right" className="h-3.5 w-3.5 rotate-180" strokeWidth={2} />
                    Back to queue
                  </GhostButton>
                )}
              </motion.div>
            </Panel>
          </div>
        )}
      </main>
    </>
  );
}
