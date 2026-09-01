"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { StatusPill } from "@/components/ui/StatusPill";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { Field, DefinitionList } from "@/components/ui/Field";
import { Page, Section } from "@/components/layout/Page";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { scanQr } from "@/lib/dismissal/client";
import { useRealtimeStatus } from "@/lib/realtime/subs";
import { useQrScanner } from "@/lib/qr/scan";

// Maps a backend error code to a human title, plain-language detail, and the
// concrete next action for the gate operator. Codes come from the scan-qr Edge
// Function / consume_qr_scan RPC. The browser never invents these — every string
// here is paired to a server-returned code; any code we don't recognise falls
// through to a generic failure message.
function describeScanError(
  code: string,
  fallback: string
): { title: string; detail: string; action: string } {
  if (code === "UNAUTHENTICATED" || code.startsWith("UNAUTHORIZED")) {
    return {
      title: "Session expired",
      detail: "Your gate session is no longer valid. Sign in again.",
      action: "Sign in at /login/gate."
    };
  }
  switch (code) {
    case "GATE_REQUIRED":
    case "FORBIDDEN":
      return {
        title: "Not authorized",
        detail: "This account is not a gate account.",
        action: "Sign in with a gate account."
      };
    case "GATE_SCHOOL_FORBIDDEN":
      return {
        title: "Wrong school",
        detail: "This request belongs to another school.",
        action: "The student is not enrolled at this school."
      };
    case "INVALID_QR":
      return {
        title: "Invalid QR code",
        detail: "This code could not be verified. Ask the parent to display the current dismissal QR.",
        action: "Ask the parent to show the QR again."
      };
    case "QR_ALREADY_USED":
      return {
        title: "Already used",
        detail: "This QR code has already been used.",
        action: "Do not scan it again — the request is already being processed."
      };
    case "QR_EXPIRED":
      return {
        title: "Expired",
        detail: "This QR code has expired.",
        action: "Ask the parent to generate a new request."
      };
    case "REQUEST_NOT_SCANNABLE":
      return {
        title: "Cannot be scanned",
        detail: "This request can no longer be scanned. It may have been cancelled or already dismissed.",
        action: "Ask the parent to create a new request."
      };
    case "INTERNAL_ERROR":
      return {
        title: "Scan failed",
        detail: fallback || "The scan could not be completed.",
        action: "Try again in a moment."
      };
    default:
      return {
        title: "Scan failed",
        detail: fallback || "The scan could not be completed.",
        action: "Try again."
      };
  }
}

type Verdict =
  | { kind: "ready" }
  | { kind: "verifying" }
  | { kind: "verified"; studentName: string; className: string }
  | { kind: "invalid"; code: string; message: string };

const REALTIME_TONE: Record<string, { label: string; tone: StatusTone }> = {
  live: { label: "Live", tone: "primary" },
  reconnecting: { label: "Reconnecting", tone: "warning" },
  closed: { label: "Offline", tone: "danger" },
  connecting: { label: "Connecting", tone: "neutral" }
};

export default function GateScannerPage() {
  const supabase = getSupabaseBrowserClient();
  const [verdict, setVerdict] = useState<Verdict>({ kind: "ready" });
  const [manualToken, setManualToken] = useState("");
  const [busy, setBusy] = useState(false);
  // Guards against duplicate submissions: a scan in flight, or the same token
  // being submitted twice (e.g. the camera re-detecting a held QR, or a double
  // click on the manual submit). The server is authoritative on single-use; this
  // only prevents redundant requests from the client.
  const busyRef = useRef(false);
  const lastTokenRef = useRef<string | null>(null);
  const autoStartedRef = useRef(false);
  const status$ = useRealtimeStatus(supabase, "dismissal_requests");

  const verify = useCallback(async (token: string) => {
    if (busyRef.current) return;
    if (lastTokenRef.current === token) return;
    busyRef.current = true;
    lastTokenRef.current = token;
    setBusy(true);
    setVerdict({ kind: "verifying" });
    try {
      const result = await scanQr(token);
      if (result.valid) {
        setVerdict({
          kind: "verified",
          studentName: result.student.name,
          className: result.student.class
        });
      } else {
        setVerdict({
          kind: "invalid",
          code: result.code,
          message: result.message
        });
      }
    } catch {
      setVerdict({
        kind: "invalid",
        code: "INTERNAL_ERROR",
        message: "Scan failed. Please try again."
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const { videoRef, canvasRef, status, error, start, stop, resume } =
    useQrScanner(verify);

  // Auto-start the camera once on mount so scanning is the dominant interaction.
  // useQrScanner already releases the camera on unmount.
  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Release the camera when the component unmounts (navigation / sign-out).
  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleReset() {
    setVerdict({ kind: "ready" });
    lastTokenRef.current = null;
    resume();
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = manualToken.trim();
    if (!token) return;
    setManualToken("");
    await verify(token);
  }

  const liveMeta = REALTIME_TONE[status$] ?? REALTIME_TONE.connecting;
  const cameraBlocked = status === "denied" || status === "error";

  return (
    <Page
      title="Verify a dismissal"
      description="Point the camera at the parent's QR code, or enter the token manually. The code is sent to the server for verification — the browser never decides whether it is valid."
      actions={
        <StatusBadge tone={liveMeta.tone} pulse={status$ === "live"}>
          {liveMeta.label}
        </StatusBadge>
      }
    >
      <Section title="Scanner">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          {/* Camera */}
          <Card>
            <CardHeader title="Camera" />
            <CardContent className="flex flex-col gap-4 py-5">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-card">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  aria-label="Gate camera preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

                {status === "scanning" && (
                  <>
                    <span className="absolute left-3 top-3 h-7 w-7 border-l-2 border-t-2 border-foreground/70" />
                    <span className="absolute right-3 top-3 h-7 w-7 border-r-2 border-t-2 border-foreground/70" />
                    <span className="absolute bottom-3 left-3 h-7 w-7 border-b-2 border-l-2 border-foreground/70" />
                    <span className="absolute bottom-3 right-3 h-7 w-7 border-b-2 border-r-2 border-foreground/70" />
                  </>
                )}

                {status === "idle" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 text-muted-foreground">
                    <Icon name="scan" className="h-9 w-9" strokeWidth={1.4} />
                    <span className="text-sm font-medium">Camera is off</span>
                  </div>
                )}

                {status === "requesting" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 text-muted-foreground">
                    <Spinner className="h-5 w-5" />
                    <span className="text-sm font-medium">Requesting camera…</span>
                  </div>
                )}
              </div>

              {status === "scanning" && (
                <p className="text-sm text-muted-foreground">
                  Hold steady — align the QR code within the corners.
                </p>
              )}

              {cameraBlocked && (
                <Alert tone="danger">
                  {error ??
                    (status === "denied"
                      ? "Camera permission was denied. Allow camera access for this site and try again."
                      : "The camera is unavailable on this device.")}
                </Alert>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {status === "scanning" || status === "requesting" ? (
                  <Button variant="outline" onClick={stop} disabled={busy}>
                    <Icon name="x" className="h-4 w-4" strokeWidth={2} />
                    Stop camera
                  </Button>
                ) : (
                  <Button variant="primary" onClick={start} disabled={busy}>
                    <Icon name="scan" className="h-4 w-4" strokeWidth={2} />
                    Start camera
                  </Button>
                )}
              </div>

              {status === "denied" && (
                <p className="text-sm text-muted-foreground">
                  You can still verify a dismissal by entering the QR token
                  manually below.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Result */}
          <Card>
            <CardHeader title="Result" />
            <CardContent className="min-h-[260px] py-5">
              <ResultPanel verdict={verdict} onReset={handleReset} />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Enter QR code manually">
        <Card>
          <CardContent className="flex flex-col gap-3 py-5">
            <p className="text-sm text-muted-foreground">
              If the camera is unavailable, paste the dismissal token below. It is
              sent to the server exactly like a scanned code — no client-side
              validation is performed.
            </p>
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label
                  htmlFor="manual-token"
                  className="mb-1.5 block text-label font-medium text-foreground"
                >
                  QR token
                </label>
                <input
                  id="manual-token"
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste the dismissal token"
                  autoComplete="off"
                  aria-label="QR token"
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={!manualToken.trim() || busy}
              >
                <Icon name="qr" className="h-4 w-4" strokeWidth={2} />
                Verify token
              </Button>
            </form>
          </CardContent>
        </Card>
      </Section>
    </Page>
  );
}

function ResultPanel({
  verdict,
  onReset
}: {
  verdict: Verdict;
  onReset: () => void;
}) {
  if (verdict.kind === "ready") {
    return (
      <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">
        Awaiting a scan. Results will appear here as soon as a QR code is read.
      </p>
    );
  }

  if (verdict.kind === "verifying") {
    return (
      <div
        className="m-auto flex items-center gap-3 text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Spinner className="h-5 w-5" />
        <span className="text-sm font-medium">Verifying…</span>
      </div>
    );
  }

  if (verdict.kind === "verified") {
    return (
      <div
        className="flex flex-col gap-5"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
            <Icon name="check" className="h-6 w-6" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="font-serif text-h2 font-semibold text-foreground">
              Code verified
            </p>
            <p className="text-sm text-muted-foreground">
              The server confirmed this QR. The student may be released to the
              teacher.
            </p>
          </div>
        </div>
        <DefinitionList>
          <Field label="Student">{verdict.studentName}</Field>
          <Field label="Class">{verdict.className}</Field>
          <Field label="Status">
            <StatusPill status="AWAITING_TEACHER" />
          </Field>
        </DefinitionList>
        <p className="text-sm text-muted-foreground">
          The teacher will now approve or reject this dismissal.
        </p>
        <Button
          variant="outline"
          onClick={onReset}
          leftIcon={<Icon name="refresh" className="h-4 w-4" strokeWidth={2} />}
        >
          Scan another QR
        </Button>
      </div>
    );
  }

  const guide = describeScanError(verdict.code, verdict.message);
  return (
    <div
      className="flex flex-col gap-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive-soft text-destructive">
          <Icon name="x" className="h-6 w-6" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="font-serif text-h2 font-semibold text-foreground">
            {guide.title}
          </p>
        </div>
      </div>
      <Alert tone="danger">{guide.detail}</Alert>
      <p className="text-sm text-muted-foreground">{guide.action}</p>
      <Button
        variant="outline"
        onClick={onReset}
        leftIcon={<Icon name="refresh" className="h-4 w-4" strokeWidth={2} />}
      >
        Scan another QR
      </Button>
    </div>
  );
}
