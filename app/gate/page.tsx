"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { TopNav } from "@/components/ui/TopNav";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { scanQr, type ScanResult } from "@/lib/dismissal/client";
import { useRealtimeStatus } from "@/lib/realtime/subs";
import { useQrScanner } from "@/lib/qr/scan";

const NAV_LINKS = [
  { label: "Scanner", href: "/gate" }
];

type Verdict =
  | { kind: "idle" }
  | { kind: "scanning" }
  | { kind: "valid"; studentName: string; className: string }
  | { kind: "invalid"; code: string; message: string };

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
        setVerdict({ kind: "invalid", code: result.code, message: result.message });
      }
    } catch {
      setVerdict({
        kind: "invalid",
        code: "INTERNAL_ERROR",
        message: "Scan failed. Please try again."
      });
    } finally {
      setBusy(false);
      // Allow another scan after a short pause so the gate staff can read the
      // result before the next QR is read.
      setTimeout(() => {
        debounceRef.current = false;
      }, 2500);
    }
  }, []);

  const { videoRef, status, error, start, stop } = useQrScanner(handleDetect);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setAuthNote("Sign in at /login/gate to open the scanner.");
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualToken.trim()) return;
    await handleDetect(manualToken.trim());
    setManualToken("");
  }

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
          02 / GATE SCANNER
        </span>
        <h2 className="font-display text-display-md uppercase text-bone mt-4">
          Pickup Verification
        </h2>
        <p className="text-muted mt-3 max-w-2xl">
          Point the camera at the parent&apos;s QR. The decoded token is sent
          to the server, which validates the hash, expiry, and single-use state
          and returns a minimal verdict.
        </p>

        {authNote && (
          <div className="mt-8">
            <Panel withTopBar topBar={<span>00 / ACCESS</span>}>
              <div className="p-7 flex flex-col gap-5">
                <p className="font-mono text-mono-sm uppercase tracking-widest text-muted">
                  {authNote}
                </p>
                <Link
                  href="/login/gate"
                  className="h-12 px-5 inline-flex items-center gap-3 bg-accent text-white font-mono uppercase tracking-widest text-mono-sm font-semibold shadow-accent-glow w-fit"
                >
                  <Icon name="arrow.right" className="h-4 w-4" strokeWidth={2} />
                  Sign In
                </Link>
              </div>
            </Panel>
          </div>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
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
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {status !== "scanning" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted font-mono uppercase tracking-widest text-mono-sm">
                    <Icon name="scan" className="h-10 w-10" strokeWidth={1.2} />
                    <span>{status === "denied" ? "Permission denied" : "Camera off"}</span>
                  </div>
                )}
                {/* Decorative scan reticle */}
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
                  </>
                )}
              </div>

              {error && (
                <p className="font-mono text-mono-xs uppercase tracking-widest text-danger">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                {status === "scanning" ? (
                  <PrimaryButton onClick={stop}>
                    <Icon name="x" className="h-4 w-4" strokeWidth={2} />
                    Stop Camera
                  </PrimaryButton>
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
            <div className="p-5 min-h-[220px] flex flex-col gap-4">
              <VerdictPanel verdict={verdict} onReset={() => setVerdict({ kind: "idle" })} />
            </div>
          </Panel>
        </div>

        <div className="mt-6">
          <Panel withTopBar topBar={<span>03 / MANUAL ENTRY</span>}>
            <form onSubmit={handleManualSubmit} className="p-5 flex flex-col gap-3">
              <p className="font-mono text-mono-xs uppercase tracking-widest text-muted">
                If the camera is unavailable, paste the token below.
              </p>
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="paste token"
                className="h-12 px-4 bg-ink text-bone border border-line rounded-none font-mono text-mono-sm outline-none focus:border-accent transition-colors"
              />
              <PrimaryButton type="submit" disabled={!manualToken.trim() || busy}>
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
  onReset
}: {
  verdict: Verdict;
  onReset: () => void;
}) {
  if (verdict.kind === "idle") {
    return (
      <p className="font-mono text-mono-sm uppercase tracking-widest text-muted">
        Awaiting a scan. Results will appear here.
      </p>
    );
  }
  if (verdict.kind === "scanning") {
    return (
      <div className="flex items-center gap-3 text-accent font-mono uppercase tracking-widest text-mono-sm">
        <Icon name="timer" className="h-4 w-4" strokeWidth={2} />
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
      >
        <div className="flex items-center gap-2 text-success font-mono uppercase tracking-widest text-mono-sm">
          <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
          Valid Request
        </div>
        <div className="hairline bg-ink p-4 flex flex-col gap-3">
          <div>
            <MonoLabel size="xs" tone="muted">STUDENT</MonoLabel>
            <p className="font-display text-2xl uppercase text-bone leading-none mt-1">
              {verdict.studentName}
            </p>
          </div>
          <div>
            <MonoLabel size="xs" tone="muted">CLASS</MonoLabel>
            <p className="font-mono text-mono-sm text-bone uppercase tracking-wider mt-1">
              {verdict.className}
            </p>
          </div>
          <div>
            <MonoLabel size="xs" tone="muted">STATUS</MonoLabel>
            <p className="font-mono text-mono-sm text-accent uppercase tracking-wider mt-1">
              Awaiting Teacher
            </p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="h-10 px-4 inline-flex items-center justify-center gap-2 hairline text-muted hover:text-bone font-mono uppercase tracking-widest text-mono-xs transition-colors"
        >
          <Icon name="arrow.right" className="h-3.5 w-3.5" strokeWidth={2} />
          Next Scan
        </button>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4"
    >
      <div className="flex items-center gap-2 text-danger font-mono uppercase tracking-widest text-mono-sm">
        <Icon name="x" className="h-4 w-4" strokeWidth={2.4} />
        Invalid QR
      </div>
      <p className="font-mono text-mono-sm text-bone leading-relaxed">
        {verdict.message}
      </p>
      <p className="font-mono text-mono-xs uppercase tracking-widest text-muted">
        Code: {verdict.code}
      </p>
      <button
        onClick={onReset}
        className="h-10 px-4 inline-flex items-center justify-center gap-2 hairline text-muted hover:text-bone font-mono uppercase tracking-widest text-mono-xs transition-colors"
      >
        <Icon name="arrow.right" className="h-3.5 w-3.5" strokeWidth={2} />
        Try Again
      </button>
    </motion.div>
  );
}
