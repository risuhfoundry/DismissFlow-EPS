"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { StatusPill } from "@/components/ui/StatusPill";
import { NavHeader } from "@/components/ui/NavHeader";
import { TabBar } from "@/components/ui/TabBar";
import type { DismissalStatus } from "@/lib/dismissal/state";

// Placeholder parent/student/guardian data — wired to real Supabase in the
// implementation phase. Kept inline so the page renders without env setup.
const PARENT = {
  name: "Priya Sharma"
};

const STUDENT = {
  name: "Aarav",
  grade: "Grade 2",
  className: "Class Tulip"
};

const INFO = {
  pickupMethod: "Parent Pickup",
  authorizedBy: "Rohit Sharma"
};

const PARENT_TABS = [
  { label: "Dashboard", icon: "square.grid.2x2" as const, href: "/parent" },
  { label: "History", icon: "clock.arrow.circlepath" as const, href: "/parent/history" },
  { label: "Profile", icon: "person.crop.circle" as const, href: "/parent/profile" }
];

// Welcome / date header — "Welcome back · Priya Sharma" + "Thursday · Oct 24".
function WelcomeRow() {
  const now = new Date();
  return (
    <div className="flex items-end justify-between animate-fade-in-up">
      <div>
        <p className="text-ios-caption-1 uppercase tracking-wide text-ink-subtle font-semibold">
          Welcome back
        </p>
        <h2 className="text-ios-title-2 text-ink mt-0.5">
          {PARENT.name}
        </h2>
      </div>
      <div className="text-right">
        <p className="text-ios-footnote text-ink-subtle">
          {now.toLocaleDateString("en-US", { weekday: "long" })}
        </p>
        <p className="text-ios-headline text-ink tabular-nums">
          {now.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
          })}
        </p>
      </div>
    </div>
  );
}

// Student card — avatar, name, grade/class pills, dismissal request area.
function StudentCard({
  status,
  onRequest,
  countdownLabel
}: {
  status: DismissalStatus;
  onRequest: () => void;
  countdownLabel: string;
}) {
  const showQr = status === "REQUESTED" || status === "AWAITING_TEACHER";

  return (
    <section
      className={clsx(
        "relative overflow-hidden rounded-[28px] bg-surface p-6",
        "shadow-card border border-hairline",
        "animate-fade-in-up delay-100"
      )}
    >
      <div className="flex items-center gap-5 relative z-10">
        <Avatar
          name={STUDENT.name}
          className="h-16 w-16 ring-1 ring-black/5"
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-ios-title-2 text-ink">
            {STUDENT.name}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-surface-muted px-2.5 py-1 text-ios-caption-1 text-ink-subtle font-semibold">
              {STUDENT.grade}
            </span>
            <span className="inline-flex items-center rounded-md bg-surface-muted px-2.5 py-1 text-ios-caption-1 text-ink-subtle font-semibold">
              {STUDENT.className}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-stretch gap-4 relative z-10 pt-5 border-t border-hairline">
        {!showQr && (
          <PrimaryButton onClick={onRequest} aria-label="Request dismissal">
            <Icon name="figure.walk" className="h-5 w-5" strokeWidth={2} />
            Request Dismissal
          </PrimaryButton>
        )}

        {showQr && <QrReveal status={status} countdownLabel={countdownLabel} />}
      </div>

      {/* Decorative blur — subtle, calm. */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary-soft blur-3xl opacity-60" />
    </section>
  );
}

// QR reveal — appears with a spring scale-in, scan-line animates, countdown ticks.
function QrReveal({
  status,
  countdownLabel
}: {
  status: DismissalStatus;
  countdownLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 animate-fade-in-up">
      <StatusPill status={status} pulse />

      <div className="relative rounded-2xl bg-surface p-4 shadow-soft border border-hairline">
        {/* Indigo corner brackets — keeps the QR framed like a viewfinder. */}
        {[
          "top-2 left-2 border-t-2 border-l-2 rounded-tl-md",
          "top-2 right-2 border-t-2 border-r-2 rounded-tr-md",
          "bottom-2 left-2 border-b-2 border-l-2 rounded-bl-md",
          "bottom-2 right-2 border-b-2 border-r-2 rounded-br-md"
        ].map((cls) => (
          <span
            key={cls}
            className={clsx(
              "absolute h-4 w-4 border-primary pointer-events-none",
              cls
            )}
          />
        ))}

        {/* QR placeholder — replaced by a real QR in implementation. */}
        <div
          className="h-40 w-40 rounded-lg bg-[radial-gradient(circle_at_1px_1px,#0b1c30_1.2px,transparent_1.4px)] [background-size:8px_8px]"
          role="img"
          aria-label="Single-use dismissal QR code"
        />

        {/* Scan line — sweeps top to bottom, infinite. */}
        <div className="pointer-events-none absolute left-4 right-4 top-4 h-[2px] bg-primary/60 blur-[1px] animate-scan" />
      </div>

      <p className="text-ios-footnote text-ink-subtle flex items-center gap-1.5">
        <Icon name="timer" className="h-4 w-4" />
        Expires in
        <span className="ml-1 text-ios-headline text-ink tabular-nums">
          {countdownLabel}
        </span>
      </p>
    </div>
  );
}

// Info grid — Pickup Method / Authorized. iOS grouped-list feel.
function InfoGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 animate-fade-in-up delay-200">
      <InfoCard
        icon={<Icon name="car" className="h-5 w-5 text-primary" />}
        label="Pickup Method"
        value={INFO.pickupMethod}
      />
      <InfoCard
        icon={<Icon name="envelope.open" className="h-5 w-5 text-primary" />}
        label="Authorized"
        value={INFO.authorizedBy}
      />
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-card-soft border border-hairline flex flex-col gap-3">
      <div className="h-10 w-10 rounded-full bg-surface-muted flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-ios-caption-1 uppercase tracking-wider text-ink-subtle mb-1 font-semibold">
          {label}
        </p>
        <p className="text-ios-headline text-ink">{value}</p>
      </div>
    </div>
  );
}

// Countdown hook — ticks every second, formats as MM:SS.
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

export default function ParentDashboardPage() {
  const [status, setStatus] = useState<DismissalStatus>("IDLE");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const countdown = useCountdown(expiresAt);

  function handleRequest() {
    // Real implementation: invoke createDismissalRequest Edge Function.
    // Docs/architecture.md §11.1.
    const expires = new Date(Date.now() + 2 * 60 * 1000); // 2 min default
    setStatus("AWAITING_TEACHER");
    setExpiresAt(expires);
  }

  return (
    <>
      <NavHeader
        title="Dashboard"
        subtitle="DismissFlow"
        leading={
          <button
            type="button"
            className="h-9 w-9 -ml-2 flex items-center justify-center rounded-full bg-primary/10 text-primary tap-spring"
            aria-label="Account"
          >
            <Icon name="person.circle" className="h-6 w-6" strokeWidth={2} />
          </button>
        }
      />

      <main className="px-5 pt-2 pb-28 flex flex-col gap-6">
        <WelcomeRow />
        <StudentCard
          status={status}
          onRequest={handleRequest}
          countdownLabel={countdown}
        />
        <InfoGrid />
      </main>

      <TabBar tabs={PARENT_TABS} />
    </>
  );
}
