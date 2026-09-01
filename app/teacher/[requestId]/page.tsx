"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button, DangerOutlineButton } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { Field, DefinitionList } from "@/components/ui/Field";
import { Page } from "@/components/layout/Page";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { approveDismissal, rejectDismissal } from "@/lib/dismissal/client";
import { useTableChanges } from "@/lib/realtime/subs";
import type { DismissalStatus } from "@/lib/dismissal/state";
import { getStatusMeta } from "@/lib/dismissal/status-meta";

type Access = {
  tone: "info" | "warning";
  message: string;
  cta: "signin" | "home";
};

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

// Status labels/tones come from the canonical vocabulary in
// lib/dismissal/status-meta.ts — identical across every portal.

function describeDecisionError(
  code: string,
  fallback: string
): { title: string; detail: string } {
  if (code === "UNAUTHENTICATED" || code.startsWith("UNAUTHORIZED")) {
    return {
      title: "Session expired",
      detail: "Your teacher session is no longer valid. Sign in again."
    };
  }
  switch (code) {
    case "TEACHER_REQUIRED":
    case "FORBIDDEN":
      return {
        title: "Not authorized",
        detail: "This account is not a teacher account."
      };
    case "TEACHER_CLASS_FORBIDDEN":
      return {
        title: "Wrong class",
        detail: "This request belongs to another class."
      };
    case "TEACHER_SCHOOL_FORBIDDEN":
      return {
        title: "Wrong school",
        detail: "This request belongs to another school."
      };
    case "REQUEST_NOT_FOUND":
      return { title: "Not found", detail: "This request is no longer available." };
    case "REQUEST_NOT_AWAITING_TEACHER":
      return {
        title: "Already decided",
        detail: "Another teacher already handled this request."
      };
    case "INVALID_DECISION":
    case "INVALID_REQUEST":
      return {
        title: "Invalid request",
        detail: "The request reference was invalid. Return to the queue."
      };
    default:
      return {
        title: "Action failed",
        detail: fallback || "The decision could not be completed."
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
  const [access, setAccess] = useState<Access | null>(null);
  const [loaded, setLoaded] = useState(false);
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

  useTableChanges<RequestRow>(
    supabase,
    "dismissal_requests",
    "*",
    handleChange
  );

  const loadRequest = useCallback(async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setAccess({
        tone: "info",
        message: "Sign in to view pickup details for your class.",
        cta: "signin"
      });
      return;
    }
    const sessionUser = await getSessionUser(supabase);
    if (!sessionUser || sessionUser.role !== "teacher") {
      setAccess({ tone: "warning", message: "This area is for teachers.", cta: "home" });
      return;
    }
    const { data: r, error: rErr } = await supabase
      .from("dismissal_requests")
      .select("request_id, student_id, status, created_at, updated_at, expires_at")
      .eq("request_id", requestId)
      .maybeSingle();
    if (rErr) throw rErr;
    // RLS scopes this to the teacher's class; a request in another class is
    // simply invisible, so an unknown id is reported as not found.
    if (!r) {
      setAccess({
        tone: "warning",
        message: "This request was not found. It may belong to another class.",
        cta: "home"
      });
      return;
    }
    setRequest(r as RequestRow);

    const { data: stu } = await supabase
      .from("students")
      .select("student_id, name, admission_no, class_id")
      .eq("student_id", (r as RequestRow).student_id)
      .maybeSingle();
    if (stu) {
      const next = stu as StudentRow;
      if (stu.class_id) {
        const { data: cls } = await supabase
          .from("classes")
          .select("class_name")
          .eq("class_id", stu.class_id)
          .maybeSingle();
        if (cls) next.class_name = cls.class_name;
      }
      setStudent(next);
    }

    const { data: sg } = await supabase
      .from("student_guardians")
      .select("guardian_id")
      .eq("student_id", (r as RequestRow).student_id)
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

    setLoaded(true);
  }, [supabase, requestId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (cancelled) return;
        await loadRequest();
      } catch {
        if (!cancelled)
          setAccess({
            tone: "warning",
            message: "We couldn't load this pickup. Please try again shortly.",
            cta: "home"
          });
      }
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
      // Re-fetch the authoritative row so the UI reflects the server's decision.
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
        setActionError(`${g.title} — ${g.detail}`);
      }
    } finally {
      setActing(null);
    }
  }

  if (access) {
    const href = access.cta === "signin" ? "/login/teacher" : "/";
    const cta = access.cta === "signin" ? "Sign in" : "Back to home";
    return (
      <Page title="Pickup detail">
        <Card>
          <CardContent className="flex flex-col gap-4 py-8">
            <Alert tone={access.tone}>{access.message}</Alert>
            <div>
              <Link href={href}>
                <Button variant={access.cta === "signin" ? "primary" : "outline"}>
                  {cta}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </Page>
    );
  }

  if (!loaded) {
    return (
      <Page title={student?.name ?? "Pickup"}>
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardContent className="space-y-4 py-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 py-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        </div>
      </Page>
    );
  }

  const status = request?.status ?? "IDLE";
  const meta = getStatusMeta(status);
  const isFinal = ["DISMISSED", "REJECTED", "CANCELLED", "EXPIRED"].includes(
    status
  );
  const isAwaiting = status === "AWAITING_TEACHER";

  return (
    <Page
      title={student?.name ?? "Pickup"}
      description={
        student
          ? `ADM ${student.admission_no}${
              student.class_name ? ` · ${student.class_name}` : ""
            }`
          : undefined
      }
    >
      <div className="max-w-2xl space-y-6">
        <Link
          href="/teacher"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="chevron.left" className="h-4 w-4" strokeWidth={2} />
          Back to queue
        </Link>

        <Card>
          <CardHeader title="Request status" />
          <CardContent className="py-5">
            <DefinitionList>
              <Field label="Status">
                <StatusBadge tone={meta.tone} pulse={!isFinal}>
                  {meta.label}
                </StatusBadge>
              </Field>
              <Field label="Requested">
                <span className="tabular-nums">
                  {request ? clockTime(request.created_at) : "—"}
                </span>
              </Field>
              {scanTime && (
                <Field label="Scanned">
                  <span className="tabular-nums">{clockTime(scanTime)}</span>
                </Field>
              )}
            </DefinitionList>
          </CardContent>
        </Card>

        {student && (
          <Card>
            <CardHeader
              title="Student"
              action={<Avatar name={student.name} size="md" />}
            />
            <CardContent className="py-5">
              <DefinitionList>
                <Field label="Name">{student.name}</Field>
                <Field label="Admission no.">
                  <span className="tabular-nums">{student.admission_no}</span>
                </Field>
                {student.class_name && (
                  <Field label="Class">{student.class_name}</Field>
                )}
              </DefinitionList>
            </CardContent>
          </Card>
        )}

        {guardian && (
          <Card>
            <CardHeader title="Guardian" />
            <CardContent className="py-5">
              <DefinitionList>
                <Field label="Name">{guardian.name}</Field>
                <Field label="Phone">
                  <span className="tabular-nums">{guardian.phone ?? "—"}</span>
                </Field>
              </DefinitionList>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader title="Decision" />
          <CardContent className="space-y-4 py-6">
            {isFinal ? (
              <Alert
                tone={
                  status === "DISMISSED"
                    ? "success"
                    : status === "REJECTED"
                      ? "danger"
                      : status === "EXPIRED"
                        ? "warning"
                        : "info"
                }
              >
                {status === "DISMISSED"
                  ? "Student dismissed. The parent has been notified in real time."
                  : status === "REJECTED"
                    ? "Request rejected. The parent has been notified in real time."
                    : status === "EXPIRED"
                      ? "This request expired before a decision was made."
                      : "This request was cancelled."}
              </Alert>
            ) : isAwaiting ? (
              <>
                <p className="text-sm text-muted-foreground">
                  You are the final authority. A QR code alone never releases a
                  student.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="primary"
                    onClick={() => void runDecision("approve")}
                    disabled={acting !== null}
                    loading={acting === "approve"}
                    leftIcon={
                      <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
                    }
                  >
                    Approve &amp; dismiss
                  </Button>
                  <DangerOutlineButton
                    onClick={() => setConfirmReject(true)}
                    disabled={acting !== null}
                  >
                    <Icon name="x" className="h-4 w-4" strokeWidth={2.4} />
                    Reject
                  </DangerOutlineButton>
                </div>
              </>
            ) : (
              <Alert tone="info">
                This request is still awaiting a gate scan. You can decide once
                the gate has scanned the pickup code.
              </Alert>
            )}

            {actionError && <Alert tone="danger">{actionError}</Alert>}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={confirmReject}
        onClose={() => setConfirmReject(false)}
        title="Reject this request?"
        description="The student will not be released and the parent is notified. This cannot be undone."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmReject(false)}
              disabled={acting !== null}
            >
              Keep request
            </Button>
            <Button
              variant="danger"
              onClick={() => void runDecision("reject")}
              disabled={acting !== null}
              loading={acting === "reject"}
            >
              Confirm reject
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          You can still approve this request instead if you change your mind
          before confirming.
        </p>
      </Modal>
    </Page>
  );
}
