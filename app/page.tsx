import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { PublicNav } from "@/components/marketing/PublicNav";
import { LinkButton } from "@/components/marketing/LinkButton";

export const metadata: Metadata = {
  metadataBase: new URL("https://dismissflow.app"),
  title: {
    default: "DismissFlow — Confident school dismissal management",
    template: "%s · DismissFlow"
  },
  description:
    "DismissFlow coordinates student dismissal through one calm, controlled workflow — from the parent's request to the gate that releases the child. Built for schools, parents, and the people at the gate.",
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
    title: "DismissFlow — Confident school dismissal management",
    description:
      "One calm, controlled workflow for student dismissal — from the parent's request to the gate that releases the child.",
    siteName: "DismissFlow"
  },
  twitter: {
    card: "summary_large_image",
    title: "DismissFlow — Confident school dismissal management",
    description:
      "One calm, controlled workflow for student dismissal — from the parent's request to the gate that releases the child."
  }
};

/* ------------------------------------------------------------------ */
/* shared section scaffolding                                          */
/* ------------------------------------------------------------------ */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="eyebrow inline-flex items-center gap-2 text-primary">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
      {children}
    </span>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  description
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div id={id} className="mx-auto max-w-2xl text-center scroll-mt-24">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-h2 font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-4 text-body-lg text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* hero visual — synthetic product illustration                        */
/* ------------------------------------------------------------------ */

function HeroVisual() {
  const steps = [
    { label: "Parent requests", done: true, icon: "user" as const },
    { label: "Teacher approves", done: false, icon: "check" as const },
    { label: "Gate verifies", done: false, icon: "scan" as const }
  ];

  return (
    <div className="relative">
      <div
        className="absolute -inset-4 -z-10 rounded-2xl bg-primary-soft/60 blur-2xl"
        aria-hidden="true"
      />
      <Card className="shadow-card">
        <CardHeader
          title="Live dismissal board"
          description="A single request, followed end to end."
        />
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-subtle p-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name="Maya Okafor" size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  Maya Okafor
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Grade 4 · Pickup by J. Okafor
                </p>
              </div>
            </div>
            <StatusPill status="AWAITING_TEACHER" pulse />
          </div>

          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={s.label} className="flex items-center gap-3">
                <span
                  className={
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full " +
                    (s.done
                      ? "bg-success text-success-foreground"
                      : "bg-surface-subtle text-muted-foreground")
                  }
                >
                  <Icon name={s.icon} className="h-4 w-4" />
                </span>
                <span
                  className={
                    "text-sm " +
                    (s.done
                      ? "text-foreground"
                      : "text-muted-foreground")
                  }
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    then
                  </span>
                )}
              </li>
            ))}
          </ol>

          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border-strong bg-card text-foreground">
              <Icon name="qr" className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Gate scan
              </p>
              <p className="text-xs text-muted-foreground">
                One tap confirms the match before release.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* audience cards                                                      */
/* ------------------------------------------------------------------ */

type Audience = {
  id: string;
  icon: "user" | "scan" | "check" | "shield";
  title: string;
  lead: string;
  points: string[];
  cta: { label: string; href: string };
};

const AUDIENCES: Audience[] = [
  {
    id: "for-parents",
    icon: "user",
    title: "For Parents",
    lead: "Request a pickup in seconds, and know exactly where it stands.",
    points: [
      "Send a dismissal request from your phone — no calls to the office.",
      "See the live status of your child's request as it moves through approval.",
      "Authorized pickups only: releases are verified at the gate."
    ],
    cta: { label: "Parent sign in", href: "/login" }
  },
  {
    id: "for-gate",
    icon: "scan",
    title: "For the Gate",
    lead: "A clear signal at the moment a child is handed over.",
    points: [
      "Scan to confirm the request and the authorized pickup match.",
      "No guessing, no paper lists, no mixing up who is cleared.",
      "Every release is recorded so the handoff is accountable."
    ],
    cta: { label: "Gate sign in", href: "/login/gate" }
  },
  {
    id: "for-teachers",
    icon: "check",
    title: "For Teachers",
    lead: "Approve from the classroom without leaving your routine.",
    points: [
      "Review the request and approve in one tap.",
      "See only the students and dismissals that belong to you.",
      "Quiet, calm handoffs that keep the classroom settled."
    ],
    cta: { label: "Teacher sign in", href: "/login/teacher" }
  },
  {
    id: "for-schools",
    icon: "shield",
    title: "For Schools",
    lead: "One controlled process the whole building can trust.",
    points: [
      "A single workflow from request to release, with no gaps in between.",
      "Role-based access: parents, gate, teachers, and admins each see their part.",
      "An audit trail of every request and every release."
    ],
    cta: { label: "Admin sign in", href: "/login/admin" }
  }
];

function AudienceCard({ a }: { a: Audience }) {
  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex h-full flex-col">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon name={a.icon} className="h-5 w-5" />
        </span>
        <h3 className="mt-4 text-h3 font-semibold text-foreground">
          {a.title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">{a.lead}</p>
        <ul className="mt-4 space-y-2.5">
          {a.points.map((p) => (
            <li key={p} className="flex gap-2.5 text-sm text-foreground">
              <Icon
                name="check"
                className="mt-0.5 h-4 w-4 shrink-0 text-success"
              />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 pt-2">
          <LinkButton href={a.cta.href} variant="outline" size="sm">
            {a.cta.label}
            <Icon name="arrow.right" className="h-4 w-4" />
          </LinkButton>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* workflow flow (5 nodes)                                             */
/* ------------------------------------------------------------------ */

const FLOW = [
  { role: "Parent", action: "Requests dismissal", icon: "user" as const },
  { role: "System", action: "Routes to teacher", icon: "scan" as const },
  { role: "Teacher", action: "Approves release", icon: "check" as const },
  { role: "Gate", action: "Verifies & releases", icon: "shield" as const },
  { role: "System", action: "Records the handoff", icon: "lock" as const }
];

function Workflow() {
  return (
    <div className="mt-12">
      <ol className="grid grid-cols-1 gap-3 md:grid-cols-5 md:gap-0">
        {FLOW.map((node, i) => (
          <li key={node.role} className="relative flex md:flex-col md:items-center">
            <div className="flex items-center gap-3 md:flex-col md:gap-3 md:text-center">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm">
                <Icon name={node.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {node.role}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {node.action}
                </p>
              </div>
            </div>
            {i < FLOW.length - 1 && (
              <span
                className="absolute left-6 top-12 hidden text-border-strong md:block"
                aria-hidden="true"
              >
                <Icon name="chevron.right" className="h-5 w-5" />
              </span>
            )}
            {i < FLOW.length - 1 && (
              <span
                className="ml-3 flex items-center text-border-strong md:hidden"
                aria-hidden="true"
              >
                <Icon name="chevron.down" className="h-5 w-5" />
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
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
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-border bg-background">
          <div className="mx-auto grid max-w-content grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
            <div className="animate-fade-in">
              <Badge tone="primary" className="mb-5">
                School dismissal, coordinated
              </Badge>
              <h1 className="text-display font-bold leading-[1.05] text-foreground">
                Student dismissal, handled with confidence.
              </h1>
              <p className="mt-5 max-w-xl text-body-lg text-muted-foreground">
                DismissFlow brings parents, the gate, and teachers into one calm,
                controlled workflow — so every child is released to the right
                person, every time.
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
              <HeroVisual />
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="border-b border-border bg-surface-subtle py-20">
          <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
            <SectionHeading
              id="how-it-works"
              eyebrow="How it works"
              title="One request, followed to the gate"
              description="Dismissal moves through a clear sequence — no phone calls, no paper lists, no guesswork."
            />
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  n: "01",
                  t: "A parent requests",
                  d: "From a phone, a parent submits a pickup request for their child. It appears in the school's dismissal board immediately."
                },
                {
                  n: "02",
                  t: "A teacher approves",
                  d: "The classroom sees the request and approves the release — keeping the decision with the people who know the students."
                },
                {
                  n: "03",
                  t: "The gate verifies",
                  d: "At handoff, the gate scans to confirm the match and releases the child only to an authorized pickup."
                }
              ].map((s) => (
                <Card key={s.n}>
                  <CardContent>
                    <span className="text-sm font-semibold tabular text-primary">
                      {s.n}
                    </span>
                    <h3 className="mt-2 text-h3 font-semibold text-foreground">
                      {s.t}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* AUDIENCES */}
        <section className="border-b border-border bg-background py-20">
          <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="For everyone at the school"
              title="A role for every hand in the handoff"
              description="Each person sees only their part of the process — clear, calm, and accountable."
            />
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {AUDIENCES.map((a) => (
                <AudienceCard key={a.id} a={a} />
              ))}
            </div>
          </div>
        </section>

        {/* PRODUCT WORKFLOW */}
        <section className="border-b border-border bg-surface-subtle py-20">
          <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="The workflow"
              title="From request to recorded handoff"
              description="Every dismissal follows the same controlled path, with a trail at each step."
            />
            <Workflow />
          </div>
        </section>

        {/* SECURITY / TRUST */}
        <section id="security" className="border-b border-border bg-background py-20 scroll-mt-24">
          <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Trust & safety"
              title="Control is built into the workflow"
              description="DismissFlow is designed around one principle: a child is released only on a verified, authorized request."
            />
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  icon: "lock" as const,
                  t: "Verified at the gate",
                  d: "Releases require a gate scan that confirms the request matches the authorized pickup."
                },
                {
                  icon: "shield" as const,
                  t: "Role-based access",
                  d: "Parents, gate staff, teachers, and admins each see only the part of the process they are responsible for."
                },
                {
                  icon: "scan" as const,
                  t: "An audit trail",
                  d: "Every request and every release is recorded, so handoffs are accountable and reviewable."
                }
              ].map((c) => (
                <Card key={c.t}>
                  <CardContent>
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Icon name={c.icon} className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-h3 font-semibold text-foreground">
                      {c.t}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              DismissFlow is a working school-operations product. Access is by
              school-issued credentials — there is no public self-signup.
            </p>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="bg-surface-subtle py-20">
          <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
            <Card className="overflow-hidden">
              <CardContent className="flex flex-col items-center gap-6 py-10 text-center sm:py-14">
                <h2 className="max-w-2xl text-h2 font-semibold text-foreground">
                  Bring calm, controlled dismissal to your school.
                </h2>
                <p className="max-w-xl text-body-lg text-muted-foreground">
                  Sign in with your school credentials to manage requests,
                  approvals, and gate releases.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <LinkButton href="/login" size="lg">
                    Sign in
                    <Icon name="arrow.right" className="h-4 w-4" />
                  </LinkButton>
                  <LinkButton href="/login/admin" variant="outline" size="lg">
                    Admin sign in
                  </LinkButton>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <span className="text-base font-semibold tracking-tight text-foreground">
                  DismissFlow
                </span>
              </div>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                Confident school dismissal management — from the parent's request
                to the gate that releases the child.
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
                  <a href="#for-parents" className="text-foreground hover:text-primary">
                    For Parents
                  </a>
                </li>
                <li>
                  <a href="#for-schools" className="text-foreground hover:text-primary">
                    For Schools
                  </a>
                </li>
                <li>
                  <a href="#security" className="text-foreground hover:text-primary">
                    Security
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

            <nav aria-label="Legal">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Legal
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a href="#" className="text-foreground hover:text-primary">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-foreground hover:text-primary">
                    Terms
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 DismissFlow. All rights reserved.</p>
            <p>School dismissal, coordinated.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
