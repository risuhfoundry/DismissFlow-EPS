"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader
} from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Page, Section } from "@/components/layout/Page";
import { DismissalQr } from "@/lib/qr/generate";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRealtimeStatus, useTableChanges } from "@/lib/realtime/subs";
import { cancelDismissal, createDismissalRequest } from "@/lib/dismissal/client";
import { dismissalStatusMeta } from "@/lib/dismissal/status-meta";
import type { DismissalStatus } from "@/lib/dismissal/state";

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

type AuthNote = {
  message: string;
  tone: "info" | "warning";
  cta: "signin" | "home";
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

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* ---- Presentational pieces (pure, prop-driven — no backend knowledge) ---- */

function ChildIdentity({ student }: { student: StudentView }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4 sm:py-5">
        <Avatar name={student.name} size="lg" />
        <div className="min-w-0">
          <p className="text-h3 font-semibold text-foreground">{student.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {student.className}
            {student.section ? ` · Section ${student.section}` : ""} ·{" "}
            <span className="tabular">{student.admissionNo}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function IdlePanel({
  onRequest,
  requesting,
  error
}: {
  onRequest: () => void;
  requesting: boolean;
  error: string | null;
}) {
  return (
    <Card className="animate-fade-in">
      <CardContent className="flex flex-col gap-5 py-8 sm:py-10">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon name="walk" className="h-6 w-6" strokeWidth={2} />
          </span>
          <div>
            <h2 className="font-serif text-h2 font-semibold text-foreground">
              No pickup in progress
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              When you&rsquo;re on the way, request a dismissal. A secure code
              is generated for the gate — single-use, valid only for this pickup.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            size="lg"
            onClick={onRequest}
            disabled={requesting}
            loading={requesting}
            leftIcon={<Icon name="walk" className="h-4 w-4" strokeWidth={2} />}
          >
            Request dismissal
          </Button>
          {error && (
            <Alert tone="error" className="flex-1">
              {error}
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QrPanel({ token, countdown }: { token: string; countdown: string }) {
  const expiringSoon = countdown.startsWith("00:0");
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full max-w-[260px] rounded-xl border border-border bg-card p-4">
        <div className="aspect-square w-full">
          <DismissalQr token={token} />
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Show this code to gate staff when you arrive. It is single-use and valid
        only for this pickup.
      </p>
      {countdown !== "—" && (
        <p
          className={
            "inline-flex items-center gap-1.5 text-sm font-medium " +
            (expiringSoon ? "text-warning" : "text-muted-foreground")
          }
        >
          <Icon name="timer" className="h-4 w-4" />
          Expires in {countdown}
        </p>
      )}
      <p className="text-center text-xs text-muted-foreground">
        This timer is a guide only — the school system confirms when your code is
        used.
      </p>
    </div>
  );
}

function ActivePanel({
  status,
  qrToken,
  countdown,
  onCancel,
  cancelling
}: {
  status: DismissalStatus;
  qrToken: string | null;
  countdown: string;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const meta = dismissalStatusMeta(status);
  return (
    <Card tone="soft" className="animate-fade-in">
      <CardHeader
        title="Pickup in progress"
        description={meta.description}
        action={<StatusBadge tone={meta.tone} pulse>{meta.label}</StatusBadge>}
      />
      <CardContent className="flex flex-col gap-6 py-8">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon
              name={status === "REQUESTED" ? "qr" : "timer"}
              className="h-6 w-6"
              strokeWidth={2}
            />
          </span>
          <h2 className="font-serif text-h2 font-semibold text-foreground">
            {meta.label}
          </h2>
        </div>
        {qrToken ? (
          <QrPanel token={qrToken} countdown={countdown} />
        ) : (
          <Alert tone="info">
            Your code was generated when you requested this pickup. If you need
            to show it again, cancel and request a new one.
          </Alert>
        )}
      </CardContent>
      {status === "REQUESTED" && (
        <CardFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={cancelling}
            loading={cancelling}
            leftIcon={<Icon name="x" className="h-4 w-4" strokeWidth={2} />}
          >
            Cancel request
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function OutcomePanel({
  status,
  onRequest,
  requesting
}: {
  status: DismissalStatus;
  onRequest: () => void;
  requesting: boolean;
}) {
  const copy: Record<
    string,
    {
      icon: "check" | "x" | "timer";
      tone: "success" | "danger" | "warning" | "neutral";
      cardTone: "success" | "danger" | "muted" | "soft";
      title: string;
      detail: string;
    }
  > = {
    DISMISSED: {
      icon: "check",
      tone: "success",
      cardTone: "success",
      title: "Dismissal completed",
      detail: "Your child has been released. The teacher confirmed the pickup."
    },
    REJECTED: {
      icon: "x",
      tone: "danger",
      cardTone: "danger",
      title: "Request rejected",
      detail:
        "The teacher could not approve this pickup. Contact the school if you believe this was in error."
    },
    CANCELLED: {
      icon: "x",
      tone: "neutral",
      cardTone: "muted",
      title: "Request cancelled",
      detail:
        "You cancelled this request. You can start a new one whenever you need a pickup."
    },
    EXPIRED: {
      icon: "timer",
      tone: "warning",
      cardTone: "soft",
      title: "Request expired",
      detail:
        "The code was not used in time and has expired. Generate a new request to try again."
    }
  };
  const c = copy[status];
  if (!c) return null;
  return (
    <Card tone={c.cardTone} className="animate-fade-in">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <span
          className={
            "inline-flex h-16 w-16 items-center justify-center rounded-full " +
            (c.tone === "success"
              ? "bg-success-soft text-success"
              : c.tone === "danger"
                ? "bg-destructive-soft text-destructive"
                : c.tone === "warning"
                  ? "bg-warning-soft text-warning"
                  : "bg-muted text-muted-foreground")
          }
        >
          <Icon name={c.icon} className="h-8 w-8" strokeWidth={2} />
        </span>
        <div>
          <h2 className="font-serif text-h2 font-semibold text-foreground">
            {c.title}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {c.detail}
          </p>
        </div>
        <Button
          onClick={onRequest}
          disabled={requesting}
          loading={requesting}
          leftIcon={<Icon name="walk" className="h-4 w-4" strokeWidth={2} />}
        >
          Request dismissal again
        </Button>
      </CardContent>
    </Card>
  );
}

function CancelDialog({
  open,
  onClose,
  onConfirm,
  cancelling
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cancelling: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancel this request?"
      description="Gate staff and the teacher will no longer see this pickup request."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={cancelling}>
            Keep request
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={cancelling}
            loading={cancelling}
          >
            Cancel request
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        You can request a new dismissal at any time after cancelling.
      </p>
    </Modal>
  );
}

// ---- Page ----

export default function ParentDashboardPage() {
  const supabase = getSupabaseBrowserClient();
  const [student, setStudent] = useState<StudentView | null>(null);
  const [activeRequest, setActiveRequest] = useState<RequestRow | null>(null);
  const [linkedStudentId, setLinkedStudentId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auth, setAuth] = useState<AuthNote | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [greeting, setGreeting] = useState("Welcome");
  const [cancelOpen, setCancelOpen] = useState(false);

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
    if (row.status !== "REQUESTED" && row.status !== "AWAITING_TEACHER") {
      setQrToken(null);
    }
  }, []);

  useTableChanges<RequestRow>(supabase, "dismissal_requests", "*", handleChange);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled)
            setAuth({
              message: "Sign in to manage pickup for your child.",
              tone: "info",
              cta: "signin"
            });
          return;
        }

        const sessionUser = await getSessionUser(supabase);
        if (!sessionUser || sessionUser.role !== "parent") {
          if (!cancelled)
            setAuth({
              message: "This area is for parents.",
              tone: "warning",
              cta: "signin"
            });
          return;
        }
        const linkedId = sessionUser.linkedStudentId;
        if (!linkedId) {
          if (!cancelled)
            setAuth({
              message:
                "No child is linked to this account. Contact your school for help.",
              tone: "warning",
              cta: "home"
            });
          return;
        }
        setLinkedStudentId(linkedId);

        const { data: stu } = await supabase
          .from("students")
          .select("student_id, name, admission_no, class_id")
          .eq("student_id", linkedId)
          .maybeSingle();

        let className = "—";
        let section = "—";
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
          .eq("student_id", linkedId)
          .in("status", ["REQUESTED", "AWAITING_TEACHER"])
          .maybeSingle();
        if (active && !cancelled) {
          setActiveRequest(active as RequestRow);
        }
        if (!cancelled) {
          setGreeting(greetingFor(new Date()));
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setAuth({
            message:
              "We couldn't load your dismissal details. Please try again shortly.",
            tone: "warning",
            cta: "home"
          });
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
      // the real, server-derived id so subsequent realtime updates match.
      const { data: created } = await supabase
        .from("dismissal_requests")
        .select("request_id, status, expires_at, student_id")
        .eq("request_id", data.request_id)
        .maybeSingle();
      if (created) {
        setActiveRequest(created as RequestRow);
      } else if (linkedStudentId) {
        setActiveRequest({
          request_id: data.request_id,
          status: "REQUESTED",
          expires_at: data.expires_at,
          student_id: linkedStudentId
        });
      }
      setQrToken(data.token);
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

  async function handleCancelConfirm() {
    if (!activeRequest || cancelling) return;
    setCancelling(true);
    setError(null);
    try {
      await cancelDismissal(activeRequest.request_id);
      setActiveRequest({ ...activeRequest, status: "CANCELLED" });
      setQrToken(null);
      setCancelOpen(false);
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
  const isFinal = ["DISMISSED", "REJECTED", "CANCELLED", "EXPIRED"].includes(
    status
  );

  const liveMeta =
    status$ === "live"
      ? { label: "Live", tone: "primary" as const }
      : status$ === "reconnecting"
        ? { label: "Reconnecting", tone: "warning" as const }
        : status$ === "closed"
          ? { label: "Offline", tone: "danger" as const }
          : { label: "Connecting", tone: "neutral" as const };

  const authHref = auth?.cta === "signin" ? "/login" : "/";
  const authCta = auth?.cta === "signin" ? "Sign in" : "Back to home";

  if (!loaded) {
    return (
      <div className="mx-auto w-full max-w-content px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Skeleton className="h-9 w-48" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (auth) {
    return (
      <Page title={greeting}>
        <Card>
          <CardContent className="flex flex-col gap-4 py-8">
            <Alert tone={auth.tone}>{auth.message}</Alert>
            <div>
              <Link href={authHref}>
                <Button variant={auth.cta === "signin" ? "primary" : "outline"}>
                  {authCta}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </Page>
    );
  }

  return (
    <>
      <Page
        title={greeting}
        description={
          student ? `Here is where pickup stands for ${student.name}.` : undefined
        }
        actions={
          <StatusBadge tone={liveMeta.tone} pulse={status$ === "live"}>
            {liveMeta.label}
          </StatusBadge>
        }
      >
        <div className="space-y-8">
          {student && (
            <Section title="Your child">
              <ChildIdentity student={student} />
            </Section>
          )}

          <Section title="Pickup">
            {isFinal ? (
              <OutcomePanel
                status={status}
                onRequest={handleRequest}
                requesting={requesting}
              />
            ) : isActive ? (
              <ActivePanel
                status={status}
                qrToken={qrToken}
                countdown={countdown}
                onCancel={() => setCancelOpen(true)}
                cancelling={cancelling}
              />
            ) : (
              <IdlePanel
                onRequest={handleRequest}
                requesting={requesting}
                error={error}
              />
            )}
          </Section>
        </div>
      </Page>

      <CancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancelConfirm}
        cancelling={cancelling}
      />
    </>
  );
}
