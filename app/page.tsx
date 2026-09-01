import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { Divider } from "@/components/ui/Divider";
import { PublicNav } from "@/components/marketing/PublicNav";
import { LinkButton } from "@/components/marketing/LinkButton";
import { WorkflowVisual } from "@/components/visual/WorkflowVisual";
import type { DismissalStatus } from "@/lib/dismissal/state";

export const metadata: Metadata = {
  metadataBase: new URL("https://dismissflow.app"),
  title: {
    default: "DismissFlow — dismissal, without the chaos",
    template: "%s · DismissFlow"
  },
  description:
    "DismissFlow turns the most volatile ten minutes of the school day into one calm, controlled workflow — a parent's request, a teacher's decision, a gate that verifies before a child is released.",
  applicationName: "DismissFlow",
  keywords: [
    "school dismissal",
    "student pickup",
    "dismissal management",
    "parent pickup",
    "school safety"
  ],
  openGraph: {
    type: "website",
    title: "DismissFlow — dismissal, without the chaos",
    description:
      "One calm, controlled workflow for student dismissal — from the parent's request to the gate that releases the child.",
    siteName: "DismissFlow"
  },
  twitter: {
    card: "summary_large_image",
    title: "DismissFlow — dismissal, without the chaos",
    description:
      "One calm, controlled workflow for student dismissal — from the parent's request to the gate that releases the child."
  }
};

/* ------------------------------------------------------------------ */
/* editorial scaffolding                                               */
/* ------------------------------------------------------------------ */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="eyebrow inline-flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
      {children}
    </span>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "left"
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      id={id}
      className={
        align === "center"
          ? "mx-auto max-w-2xl text-center scroll-mt-24"
          : "max-w-2xl scroll-mt-24"
      }
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 font-serif text-display font-semibold text-foreground">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-body-lg text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* illustrative product previews (structural, clearly non-production) */
/* ------------------------------------------------------------------ */

function PreviewTag() {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      Preview
    </span>
  );
}

function ParentPreview() {
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Your child" action={<PreviewTag />} />
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar name="Student" size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              Student · Grade 4
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Pickup by guardian
            </p>
          </div>
        </div>
        <Divider />
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              Waiting for teacher
            </p>
          </div>
          <StatusPill status="AWAITING_TEACHER" pulse />
        </div>
      </CardContent>
    </Card>
  );
}

function TeacherPreview() {
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Pickup queue" action={<PreviewTag />} />
      <CardContent className="space-y-2">
        {[
          { name: "Student · Grade 4", meta: "Pending", tone: "warning" as const },
          { name: "Student · Grade 2", meta: "Pending", tone: "warning" as const }
        ].map((r) => (
          <div
            key={r.name}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-subtle px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name="Student" size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {r.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">{r.meta}</p>
              </div>
            </div>
            <span className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
              Approve
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function GatePreview() {
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Gate scan" action={<PreviewTag />} />
      <CardContent>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-success/40 bg-success-soft px-4 py-8 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-success text-success-foreground">
            <Icon name="check" className="h-7 w-7" strokeWidth={2.4} />
          </span>
          <p className="text-h3 font-semibold text-foreground">Valid</p>
          <p className="text-sm text-muted-foreground">
            Matches an approved request. Release allowed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminPreview() {
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Operations" action={<PreviewTag />} />
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {[
            { k: "Active", v: "12" },
            { k: "Awaiting", v: "4" },
            { k: "Released", v: "38" }
          ].map((s) => (
            <div
              key={s.k}
              className="rounded-lg border border-border bg-surface-subtle px-3 py-3 text-center"
            >
              <p className="text-h3 font-semibold tabular text-foreground">
                {s.v}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.k}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  return (
    <>
      <PublicNav />
      <main>
        {/* 01 — HERO (asymmetric, editorial) */}
        <section className="relative overflow-hidden border-b border-border bg-background">
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.5]"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(60% 50% at 80% 0%, var(--color-primary-soft) 0%, transparent 70%)"
            }}
          />
          <div className="mx-auto grid max-w-content grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-8 lg:py-24">
            <div className="animate-fade-in">
              <Badge tone="primary" className="mb-6">
                School dismissal, coordinated
              </Badge>
              <h1 className="font-serif text-hero font-semibold leading-[1.02] text-foreground">
                Dismissal, without the chaos.
              </h1>
              <p className="mt-6 max-w-xl text-body-lg text-muted-foreground">
                The last ten minutes of the school day are the most volatile.
                DismissFlow turns them into one quiet, controlled workflow — a
                parent&rsquo;s request, a teacher&rsquo;s decision, a gate that
                verifies before a child is released.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <LinkButton href="/login" size="lg">
                  Sign in
                  <Icon name="arrow.right" className="h-4 w-4" />
                </LinkButton>
                <LinkButton href="#how-it-works" variant="outline" size="lg">
                  See how it works
                </LinkButton>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Built for schools, parents, and the people at the gate.
              </p>
            </div>

            <div className="animate-fade-in">
              <div className="relative rounded-2xl border border-border bg-card p-3 shadow-card">
                <div className="h-[18rem] overflow-hidden rounded-xl bg-background sm:h-[22rem]">
                  <WorkflowVisual />
                </div>
                <p className="mt-3 px-1 text-xs text-muted-foreground">
                  The dismissal journey, end to end — from request to release.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 02 — THE PROBLEM (fragmented, disconnected workflow) */}
        <section className="border-b border-border bg-surface-subtle py-20 lg:py-28">
          <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="The problem"
              title="Every handoff is a chance to lose the thread."
              description="In most schools, dismissal still runs on memory, paper, and hallway phone calls. Each person works from their own incomplete picture."
            />
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { n: "1", t: "A parent calls", d: "Pickup is arranged by phone — if it's arranged at all." },
                { n: "2", t: "A teacher checks", d: "The room is pulled aside to confirm a name by memory." },
                { n: "3", t: "Names are matched", d: "A paper list travels from classroom to gate, by hand." },
                { n: "4", t: "The gate guesses", d: "Who is actually cleared to go is decided on the spot." },
                { n: "5", t: "A child leaves", d: "The handoff happens — and no one shares one record of it." }
              ].map((s) => (
                <div
                  key={s.n}
                  className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-card p-5"
                >
                  <span className="font-serif text-2xl font-semibold tabular text-muted-foreground">
                    {s.n}
                  </span>
                  <h3 className="text-h3 font-semibold text-foreground">{s.t}</h3>
                  <p className="text-sm text-muted-foreground">{s.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {[
                "Unclear status — no one knows exactly where a pickup stands.",
                "Manual coordination — every change is a new phone call.",
                "Repeated verification — the same child is checked again and again.",
                "Unnecessary waiting — the lobby fills while people figure it out."
              ].map((p) => (
                <p
                  key={p}
                  className="bg-card p-5 text-sm text-muted-foreground"
                >
                  {p}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* 03 — THE DISMISFLOW MODEL (one connected mechanism) */}
        <section
          id="how-it-works"
          className="scroll-mt-24 border-b border-border bg-background py-20 lg:py-28"
        >
          <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="How it works"
              title="One workflow, followed to the gate."
              description="Dismissal becomes a single sequence everyone can see. No phone calls, no paper lists, no guessing who is cleared."
            />
            <ol className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                {
                  n: "01",
                  t: "Request",
                  d: "A parent submits a pickup from their phone. It appears the moment it's sent."
                },
                {
                  n: "02",
                  t: "Review",
                  d: "The teacher receives the request with the student's context in hand."
                },
                {
                  n: "03",
                  t: "Approve",
                  d: "The teacher confirms the release — the decision stays with the classroom."
                },
                {
                  n: "04",
                  t: "Verify",
                  d: "A single code carries the approval to the gate and is scanned to confirm."
                },
                {
                  n: "05",
                  t: "Dismiss",
                  d: "The child is released only to an authorized pickup, and the step is recorded."
                }
              ].map((s, i) => (
                <li
                  key={s.n}
                  className="relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
                >
                  {i < 4 && (
                    <span
                      className="absolute -right-2.5 top-1/2 hidden h-px w-5 -translate-y-1/2 bg-border lg:block"
                      aria-hidden="true"
                    />
                  )}
                  <span className="font-serif text-2xl font-semibold tabular text-primary">
                    {s.n}
                  </span>
                  <h3 className="text-h3 font-semibold text-foreground">{s.t}</h3>
                  <p className="text-sm text-muted-foreground">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 04 — ROLE EXPERIENCES (four distinct compositions) */}
        <section
          id="for-schools"
          className="scroll-mt-24 border-b border-border bg-surface-subtle py-20 lg:py-28"
        >
          <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="For everyone in the handoff"
              title="A role for every hand in the handoff."
              description="Each person sees only their part of the process — clear, calm, and accountable."
            />

            {/* Parent — text left, preview right */}
            <div
              id="for-parents"
              className="mt-12 grid scroll-mt-24 grid-cols-1 items-center gap-8 lg:grid-cols-2"
            >
              <div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon name="user" className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-h2 font-semibold text-foreground">
                  Parent — know what&rsquo;s happening.
                </h3>
                <p className="mt-3 max-w-md text-sm text-muted-foreground">
                  One tap requests a pickup. From there, the status moves live —
                  requested, approved, dismissed — so a parent always knows where
                  the child stands. Only authorized pickups are ever released.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Request a pickup in seconds — no call to the office.",
                    "Watch the status move, live, toward release.",
                    "A single code is shown at the gate when you arrive."
                  ].map((p) => (
                    <li key={p} className="flex gap-2.5 text-sm text-muted-foreground">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <LinkButton
                  href="/login"
                  variant="outline"
                  size="sm"
                  className="mt-6"
                >
                  Parent sign in
                  <Icon name="arrow.right" className="h-4 w-4" />
                </LinkButton>
              </div>
              <ParentPreview />
            </div>

            {/* Teacher — preview left, text right */}
            <div className="mt-12 grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
              <TeacherPreview />
              <div className="lg:order-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon name="check" className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-h2 font-semibold text-foreground">
                  Teacher — make the decision once.
                </h3>
                <p className="mt-3 max-w-md text-sm text-muted-foreground">
                  Requests arrive with the student&rsquo;s context, already scoped
                  to your class. Approve or reject in one deliberate action — the
                  room stays settled and the handoff stays with you.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "See only your students and their requests.",
                    "Approve from the classroom in one tap.",
                    "Quiet handoffs that keep teaching on track."
                  ].map((p) => (
                    <li key={p} className="flex gap-2.5 text-sm text-muted-foreground">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <LinkButton
                  href="/login/teacher"
                  variant="outline"
                  size="sm"
                  className="mt-6"
                >
                  Teacher sign in
                  <Icon name="arrow.right" className="h-4 w-4" />
                </LinkButton>
              </div>
            </div>

            {/* Gate — text left, wide preview right */}
            <div className="mt-12 grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
              <div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon name="scan" className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-h2 font-semibold text-foreground">
                  Gate — verify before release.
                </h3>
                <p className="mt-3 max-w-md text-sm text-muted-foreground">
                  At handoff, scan to confirm the request matches the authorized
                  pickup. No paper lists, no guessing who is cleared — and every
                  release is recorded.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Scan to confirm the request and pickup match.",
                    "A clear valid / invalid verdict, every time.",
                    "The release is written to the school's record."
                  ].map((p) => (
                    <li key={p} className="flex gap-2.5 text-sm text-muted-foreground">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <LinkButton
                  href="/login/gate"
                  variant="outline"
                  size="sm"
                  className="mt-6"
                >
                  Gate sign in
                  <Icon name="arrow.right" className="h-4 w-4" />
                </LinkButton>
              </div>
              <GatePreview />
            </div>

            {/* Admin — full-width band */}
            <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="grid grid-cols-1 items-center gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_1.1fr]">
                <div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icon name="shield" className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-h2 font-semibold text-foreground">
                    Admin — see the operation clearly.
                  </h3>
                  <p className="mt-3 max-w-md text-sm text-muted-foreground">
                    One workflow from request to release, with role-based access
                    for every person and a complete trail of each handoff.
                  </p>
                  <LinkButton
                    href="/login/admin"
                    variant="outline"
                    size="sm"
                    className="mt-6"
                  >
                    Admin sign in
                    <Icon name="arrow.right" className="h-4 w-4" />
                  </LinkButton>
                </div>
                <AdminPreview />
              </div>
            </div>
          </div>
        </section>

        {/* 05 — PRODUCT PREVIEWS (one system, two views) */}
        <section className="border-b border-border bg-background py-20 lg:py-28">
          <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Inside DismissFlow"
              title="The same calm, in every view."
              description="Whatever your role, the experience is quiet, legible, and built around one question: is this child safe to release?"
            />
            <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ParentPreview />
              <GatePreview />
            </div>
          </div>
        </section>

        {/* 06 — STATUS LIFECYCLE (the real states) */}
        <section className="border-b border-border bg-surface-subtle py-20 lg:py-28">
          <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="The life of a request"
              title="Every request moves through real states."
              description="No hidden steps. A pickup is always in one of a small set of states everyone can read."
            />
            <ul className="mt-12 space-y-px overflow-hidden rounded-2xl border border-border">
              {(
                [
                  {
                    status: "REQUESTED" as DismissalStatus,
                    d: "A parent has asked for a pickup. The request is live and visible to the school."
                  },
                  {
                    status: "AWAITING_TEACHER" as DismissalStatus,
                    d: "The request waits on the teacher's decision — the gate cannot act yet."
                  },
                  {
                    status: "DISMISSED" as DismissalStatus,
                    d: "Approved and released. The child has left with an authorized pickup."
                  },
                  {
                    status: "REJECTED" as DismissalStatus,
                    d: "The teacher declined the release. The parent is notified."
                  },
                  {
                    status: "CANCELLED" as DismissalStatus,
                    d: "The parent withdrew the request before it was used."
                  },
                  {
                    status: "EXPIRED" as DismissalStatus,
                    d: "The code was not scanned in time and is no longer valid."
                  }
                ] as { status: DismissalStatus; d: string }[]
              ).map((s) => (
                <li
                  key={s.status}
                  className="grid grid-cols-[1fr_auto] items-center gap-4 bg-card p-5 sm:grid-cols-[14rem_1fr] sm:gap-8 sm:p-6"
                >
                  <StatusPill status={s.status} />
                  <p className="text-sm text-muted-foreground">{s.d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 07 — TRUST (only what the system supports) */}
        <section
          id="security"
          className="scroll-mt-24 border-b border-border bg-background py-20 lg:py-28"
        >
          <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Trust & safety"
              title="A child is released only on a verified request."
              description="Control is built into the workflow, not bolted on after. Every step depends on the one before it."
            />
            <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
              {[
                {
                  icon: "lock" as const,
                  t: "Authenticated users",
                  d: "Every sign-in is a real school credential. No public self-signup, no anonymous access."
                },
                {
                  icon: "shield" as const,
                  t: "Role-based access",
                  d: "Parents, gate, teachers, and admins each see only the part they are responsible for."
                },
                {
                  icon: "school" as const,
                  t: "School isolation",
                  d: "Data is scoped to the school. One school never sees another's students or requests."
                },
                {
                  icon: "scan" as const,
                  t: "QR verification",
                  d: "Release requires a gate scan that confirms the request matches the authorized pickup."
                },
                {
                  icon: "check" as const,
                  t: "Teacher approval",
                  d: "A release cannot happen without the teacher's explicit confirmation."
                },
                {
                  icon: "activity" as const,
                  t: "Real-time status",
                  d: "The people involved see the same status at the same time — no stale paper lists."
                }
              ].map((c) => (
                <div key={c.t} className="bg-card p-6">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icon name={c.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-h3 font-semibold text-foreground">
                    {c.t}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 max-w-2xl text-sm text-muted-foreground">
              DismissFlow is a working school-operations product. Access is by
              school-issued credentials — there is no public self-signup.
            </p>
          </div>
        </section>

        {/* 08 — WHY THE WORKFLOW MATTERS (value) */}
        <section className="border-b border-border bg-surface-subtle py-20 lg:py-28">
          <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Why the workflow matters"
              title="Less software. Fewer loose ends."
              description="The value isn't another app to learn. It's the uncertainty that disappears when everyone shares one sequence."
            />
            <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {[
                { t: "Less uncertainty", d: "Every person knows exactly where a pickup stands." },
                { t: "Less coordination", d: "No phone tree to confirm a single change." },
                { t: "Clearer responsibility", d: "The teacher owns the decision; the gate owns the check." },
                { t: "Faster verification", d: "A scan settles the question in a moment." },
                { t: "Better visibility", d: "The admin sees the whole operation at once." },
                { t: "One record", d: "Each handoff is written down and accountable." }
              ].map((v) => (
                <div key={v.t} className="bg-card p-6">
                  <h3 className="font-serif text-h3 font-semibold text-foreground">
                    {v.t}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{v.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 09 — PRODUCT EXPERIENCE (one system, four perspectives) */}
        <section className="border-b border-border bg-background py-20 lg:py-28">
          <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="One system, four perspectives"
              title="The same workflow, seen from four seats."
              description="DismissFlow isn't four dashboards. It's one controlled handoff, viewed by the people in it."
            />
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: "user" as const,
                  t: "Parent",
                  d: "Sees status move from request to release."
                },
                {
                  icon: "check" as const,
                  t: "Teacher",
                  d: "Sees the request and makes the call."
                },
                {
                  icon: "scan" as const,
                  t: "Gate",
                  d: "Sees the verification at the door."
                },
                {
                  icon: "shield" as const,
                  t: "Admin",
                  d: "Sees the operation, end to end."
                }
              ].map((p) => (
                <div
                  key={p.t}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icon name={p.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="text-h3 font-semibold text-foreground">{p.t}</h3>
                  <p className="text-sm text-muted-foreground">{p.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 10 — FINAL CTA */}
        <section className="bg-background py-20 lg:py-28">
          <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-14 text-center shadow-card sm:px-12 sm:py-20">
              <div
                className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-48 opacity-60"
                aria-hidden="true"
                style={{
                  background:
                    "radial-gradient(50% 100% at 50% 0%, var(--color-primary-soft) 0%, transparent 70%)"
                }}
              />
              <h2 className="mx-auto max-w-2xl font-serif text-display font-semibold text-foreground">
                Bring calm to the end of the school day.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-body-lg text-muted-foreground">
                Sign in with your school credentials to manage requests,
                approvals, and gate releases.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <LinkButton href="/login" size="lg">
                  Sign in
                  <Icon name="arrow.right" className="h-4 w-4" />
                </LinkButton>
                <LinkButton href="/login/admin" variant="outline" size="lg">
                  Admin sign in
                </LinkButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto grid max-w-content grid-cols-2 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div className="col-span-2 lg:col-span-1">
            <p className="text-base font-semibold tracking-tight text-foreground">
              DismissFlow
            </p>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Confident school dismissal management — from the parent&rsquo;s
              request to the gate that releases the child.
            </p>
          </div>

          <nav aria-label="Product">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Product
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="#how-it-works" className="text-foreground hover:text-primary">
                  How it works
                </a>
              </li>
              <li>
                <a href="#security" className="text-foreground hover:text-primary">
                  Trust &amp; safety
                </a>
              </li>
              <li>
                <a href="#for-parents" className="text-foreground hover:text-primary">
                  For Parents
                </a>
              </li>
              <li>
                <a href="#for-schools" className="text-foreground hover:text-primary">
                  For Schools
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Sign in">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sign in
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <LinkButton href="/login" variant="ghost" size="sm" className="px-0 text-foreground hover:bg-transparent hover:text-primary">
                  Parent
                </LinkButton>
              </li>
              <li>
                <LinkButton href="/login/teacher" variant="ghost" size="sm" className="px-0 text-foreground hover:bg-transparent hover:text-primary">
                  Teacher
                </LinkButton>
              </li>
              <li>
                <LinkButton href="/login/gate" variant="ghost" size="sm" className="px-0 text-foreground hover:bg-transparent hover:text-primary">
                  Gate
                </LinkButton>
              </li>
              <li>
                <LinkButton href="/login/admin" variant="ghost" size="sm" className="px-0 text-foreground hover:bg-transparent hover:text-primary">
                  Admin
                </LinkButton>
              </li>
            </ul>
          </nav>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Access
            </p>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              DismissFlow is provided through schools. There is no public
              self-signup — accounts are issued by your school.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-content border-t border-border px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <p>© 2026 DismissFlow. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
