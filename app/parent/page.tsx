"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { StatusPill } from "@/components/ui/StatusPill";
import { TopNav } from "@/components/ui/TopNav";
import type { DismissalStatus } from "@/lib/dismissal/state";

const PARENT = { name: "Priya Sharma" };
const STUDENT = { name: "Aarav", grade: "Grade 2", className: "Tulip", adm: "040" };
const INFO = { method: "Parent Pickup", authorized: "Rohit Sharma" };

const NAV_LINKS = [
  { label: "Dashboard", href: "/parent" },
  { label: "History", href: "/parent/history" },
  { label: "Profile", href: "/parent/profile" }
];

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
      01 / PARENT PORTAL <span className="ml-1 px-1.5 py-0.5 border border-line text-mono-xs">V0.1</span>
    </span>
  );
}

function WelcomeRow() {
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
          {PARENT.name}
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
  status,
  onRequest,
  countdown
}: {
  status: DismissalStatus;
  onRequest: () => void;
  countdown: string;
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
                {STUDENT.name}
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Spec label="GRADE" value={STUDENT.grade} />
                <Spec label="CLASS" value={STUDENT.className} />
                <Spec label="ADM" value={STUDENT.adm} />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 min-w-[260px]">
            {!showQr ? (
              <PrimaryButton onClick={onRequest} aria-label="Request dismissal">
                <Icon name="walk" className="h-4 w-4" strokeWidth={2} />
                Request Dismissal
              </PrimaryButton>
            ) : (
              <QrReveal status={status} countdown={countdown} />
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
  countdown
}: {
  status: DismissalStatus;
  countdown: string;
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
        {/* Mono hairline corner brackets — replaces the indigo brackets. */}
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

        {/* Scan line — blue, sweeps top to bottom. */}
        <div className="pointer-events-none absolute left-3 right-3 top-3 h-[2px] bg-accent shadow-accent-glow animate-scan" />
      </div>

      <div className="flex items-center justify-between text-mono-sm font-mono uppercase tracking-widest">
        <span className="text-muted">EXPIRES IN</span>
        <span className="text-bone tabular-nums">{countdown}</span>
      </div>
    </motion.div>
  );
}

function InfoGrid() {
  const items = [
    { icon: "car" as const, label: "Pickup Method", value: INFO.method },
    { icon: "user" as const, label: "Authorized", value: INFO.authorized },
    { icon: "history" as const, label: "Today", value: "02 dismissals" },
    { icon: "settings" as const, label: "Class", value: STUDENT.className }
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
  const [status, setStatus] = useState<DismissalStatus>("IDLE");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const countdown = useCountdown(expiresAt);

  function handleRequest() {
    // Real implementation invokes createDismissalRequest Edge Function.
    // Docs/architecture.md §11.1.
    setStatus("AWAITING_TEACHER");
    setExpiresAt(new Date(Date.now() + 2 * 60 * 1000));
  }

  return (
    <>
      <TopNav
        links={NAV_LINKS}
        trailing={
          <div className="hidden md:flex items-center gap-2 hairline bg-panel px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_#B7EF42] animate-pulse-dot" />
            <MonoLabel size="xs" tone="bone">
              REALTIME · SUBSCRIBED
            </MonoLabel>
          </div>
        }
      />

      <main className="pt-24 pb-16 section-shell">
        <WelcomeRow />
        <div className="mt-10 grid gap-8">
          <StudentCard
            status={status}
            onRequest={handleRequest}
            countdown={countdown}
          />
          <InfoGrid />
          <Footer />
        </div>
      </main>
    </>
  );
}
