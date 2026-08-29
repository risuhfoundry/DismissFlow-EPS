"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { PrimaryButton, SecondaryButton, GhostButton } from "@/components/ui/Button";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { TopNav } from "@/components/ui/TopNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccessNote } from "@/components/ui/AccessNote";
import { Alert } from "@/components/ui/Alert";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { scanQr, type ScanResult } from "@/lib/dismissal/client";
import { useRealtimeStatus } from "@/lib/realtime/subs";
import { useQrScanner } from "@/lib/qr/scan";

const NAV_LINKS = [{ label: "Scanner", href: "/gate" }];

type Verdict =
  | { kind: "idle" }
  | { kind: "scanning" }
  | { kind: "valid"; studentName: string; className: string }
  | { kind: "invalid"; code: string; message: string };

// Maps a backend error code to a human title, plain-language detail, and the
// concrete next action for the gate operator. Codes come from the scan-qr Edge
// Function / consume_qr_scan RPC (Docs/architecture.md §11.2, §14.3).
function describeError(
  code: string,
  fallback: string
): { title: string; detail: string; action: string } {
  if (code === "UNAUTHENTICATED" || code.startsWith("UNAUTHORIZED")) {
    return {
      title: "Session Expired",
      detail: "Your gate session is no longer valid.",
      action: "Sign in again at /login/gate."
    };
  }
  switch (code) {
    case "GATE_REQUIRED":
    case "FORBIDDEN":
      return {
        title: "Not Authorized",
        detail: "This account is not a gate account.",
        action: "Sign in with a gate account."
      };
    case "INVALID_QR":
      return {
        title: "Invalid QR",
        detail: "This QR code could not be read as a dismissal token.",
        action: "Ask the parent to show the QR again."
      };
    case "QR_ALREADY_USED":
      return {
        title: "Already Used",
        detail: "This QR code has already been scanned.",
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
        title: "Not Scannable",
        detail: "This request cannot be scanned right now.",
        action: "The request may have been cancelled or already dismissed."
      };
    case "INTERNAL_ERROR":
      return {
        title: "Scan Failed",
        detail: fallback || "The scan could not be completed.",
        action: "Try again in a moment."
      };
    default:
      return {
        title: "Scan Failed",
        detail: fallback || "The scan could not be completed.",
        action: "Try again."
      };
  }
}

export default function GateScannerPage() {
  const supabase = getSupabaseBrowserClient();
  const [verdict, setVerdict] = useState<Verdict>({ kind: "idle" });
  const [manualToken, setManualToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const debounceRef = useRef(false);
  const status$ = useRealtimeStatus(supabase, "dismissal_requests");

  const handleDetect = useCallback(async (token: string) => {
    if (debounceRef.current) return;
    debounceRef.current = true;
    setVerdict({ kind: "scanning" });
    setBusy(true);
    try {
      const result: ScanResult = await scanQr(token);
      if (result.valid) {
        setVerdict({
          kind: "valid",
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
      setBusy(false);
      setTimeout(() => {
        debounceRef.current = false;
      }, 1500);
    }
  }, []);

  const { videoRef, canvasRef, status, error, start, stop, resume } =
    useQrScanner(handleDetect);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user && !cancelled) {
        setAuthNote("Sign in at /login/gate to open the scanner.");
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleNext() {
    setVerdict({ kind: "idle" });
    resume();
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualToken.trim()) return;
    const token = manualToken.trim();
    setManualToken("");
    await handleDetect(token);
  }

  const overlayLabel =
    status === "denied"
      ? "Permission denied"
      : status === "error"
        ? "Camera unavailable"
        : status === "requesting"
          ? "Starting…"
          : "Camera off";

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
          eyebrow="02 / GATE SCANNER"
          title="Pickup Verification"
          description="Point the camera at the parent's QR. The decoded token is sent to the server, which validates the hash, expiry, and single-use state and returns a minimal verdict. The browser never decides validity."
        />

        {authNote && (
          <div className="mt-8">
            <AccessNote message={authNote} signInHref="/login/gate" signInLabel="Sign In" />
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <Panel
            withTopBar
            topBar={
              <>
                <span>01 / CAMERA</span>
                <span className="text-muted">{status.toUpperCase()}</span>
              </>
            }
          >
            <div className="p-5 flex flex-col gap-4">
              <div className="relative aspect-video bg-ink overflow-hidden hairline">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  aria-label="Gate camera preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
                {status !== "scanning" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted font-mono uppercase tracking-widest text-mono-sm">
                    <Icon name="scan" className="h-10 w-10" strokeWidth={1.2} />
                    <span>{overlayLabel}</span>
                  </div>
                )}
                {status === "scanning" && (
                  <>
                    {[
                      "top-3 left-3 border-t border-l",
                      "top-3 right-3 border-t border-r",
                      "bottom-3 left-3 border-b border-l",
                      "bottom-3 right-3 border-b border-r"
                    ].map((c) => (
                      <span
                        key={c}
                        className={`absolute h-6 w-6 border-accent ${c}`}
                        style={{ borderWidth: 2 }}
                      />
                    ))}
                    <div className="absolute left-0 right-0 top-1/2 h-px bg-accent/50" />
                  </>
                )}
              </div>

              {error && <Alert tone="danger">{error}</Alert>}

              <div className="flex flex-wrap gap-3">
                {status === "scanning" ? (
                  <SecondaryButton onClick={stop}>
                    <Icon name="x" className="h-4 w-4" strokeWidth={2} />
                    Stop Camera
                  </SecondaryButton>
                ) : (
                  <PrimaryButton onClick={start} disabled={busy}>
                    <Icon name="scan" className="h-4 w-4" strokeWidth={2} />
                    Start Camera
                  </PrimaryButton>
                )}
              </div>
            </div>
          </Panel>

          <Panel withTopBar topBar={<span>02 / RESULT</span>}>
            <div className="p-5 min-h-[240px] flex flex-col gap-4">
              <VerdictPanel verdict={verdict} onNext={handleNext} />
            </div>
          </Panel>
        </div>

        <div className="mt-6">
          <Panel withTopBar topBar={<span>03 / MANUAL ENTRY</span>}>
            <form onSubmit={handleManualSubmit} className="p-5 flex flex-col gap-3">
              <p className="font-mono text-mono-xs uppercase tracking-widest text-muted">
                If the camera is unavailable, paste the token below. It is sent
                to the server exactly like a scanned code — no client-side
                validation is performed.
              </p>
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="paste token"
                aria-label="Manual QR token"
                className="h-12 px-4 bg-ink text-bone border border-line rounded-none font-mono text-mono-sm outline-none focus:border-accent transition-colors"
              />
              <PrimaryButton type="submit" disabled={!manualToken.trim() || busy} className="self-start">
                <Icon name="arrow.right" className="h-4 w-4" strokeWidth={2} />
                Submit
              </PrimaryButton>
            </form>
          </Panel>
        </div>
      </main>
    </>
  );
}

function VerdictPanel({
  verdict,
  onNext
}: {
  verdict: Verdict;
  onNext: () => void;
}) {
  if (verdict.kind === "idle") {
    return (
      <p className="font-mono text-mono-sm uppercase tracking-widest text-muted m-auto">
        Awaiting a scan. Results will appear here.
      </p>
    );
  }
  if (verdict.kind === "scanning") {
    return (
      <div className="flex items-center gap-3 text-accent font-mono uppercase tracking-widest text-mono-sm m-auto">
        <Icon name="timer" className="h-4 w-4 animate-spin" strokeWidth={2} />
        Validating…
      </div>
    );
  }
  if (verdict.kind === "valid") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-4"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-success font-mono uppercase tracking-widest text-mono-sm">
          <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
          Valid Request
        </div>
        <div className="hairline bg-ink p-4 flex flex-col gap-3">
          <div>
            <MonoLabel size="xs" tone="muted">
              STUDENT
            </MonoLabel>
            <p className="font-display text-2xl uppercase text-bone leading-none mt-1">
              {verdict.studentName}
            </p>
          </div>
          <div>
            <MonoLabel size="xs" tone="muted">
              CLASS
            </MonoLabel>
            <p className="font-mono text-mono-sm text-bone uppercase tracking-wider mt-1">
              {verdict.className}
            </p>
          </div>
          <div>
            <MonoLabel size="xs" tone="muted">
              STATUS
            </MonoLabel>
            <p className="font-mono text-mono-sm text-accent uppercase tracking-wider mt-1">
              Awaiting Teacher
            </p>
          </div>
        </div>
        <GhostButton onClick={onNext}>
          <Icon name="arrow.right" className="h-3.5 w-3.5" strokeWidth={2} />
          Next Scan
        </GhostButton>
      </motion.div>
    );
  }

  const guide = describeError(verdict.code, verdict.message);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-2 text-danger font-mono uppercase tracking-widest text-mono-sm">
        <Icon name="x" className="h-4 w-4" strokeWidth={2.4} />
        {guide.title}
      </div>
      <p className="font-mono text-mono-sm text-bone leading-relaxed">
        {guide.detail}
      </p>
      <p className="font-mono text-mono-xs uppercase tracking-widest text-muted">
        Next: {guide.action}
      </p>
      <p className="font-mono text-mono-xs uppercase tracking-widest text-muted">
        Code: {verdict.code}
      </p>
      <GhostButton onClick={onNext}>
        <Icon name="arrow.right" className="h-3.5 w-3.5" strokeWidth={2} />
        Try Again
      </GhostButton>
    </motion.div>
  );
}
