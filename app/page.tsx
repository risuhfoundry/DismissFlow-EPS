import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { TopNav } from "@/components/ui/TopNav";
import { VersionTag } from "@/components/ui/VersionTag";

const ROLES = [
  {
    label: "Parent",
    code: "01",
    blurb: "Request pickup, show the QR, watch dismissal in real time.",
    href: "/parent"
  },
  {
    label: "Gate",
    code: "02",
    blurb: "Authenticate the gate device, scan the QR, get a minimal verdict.",
    href: "/gate"
  },
  {
    label: "Teacher",
    code: "03",
    blurb: "Live pickup queue, final approve/reject, manual verification.",
    href: "/teacher"
  },
  {
    label: "Admin",
    code: "04",
    blurb: "Roster, class assignment, dismissal audit logs.",
    href: "/admin"
  }
];

export default function HomePage() {
  return (
    <>
      <TopNav
        links={[
          { label: "Architecture", href: "https://github.com/risuhfoundry/DismissFlow-EPS/blob/main/Docs/architecture.md" },
          { label: "PRD", href: "https://github.com/risuhfoundry/DismissFlow-EPS/blob/main/Docs/PRD.md" }
        ]}
        trailing={<VersionTag />}
      />

      <main className="pt-24 pb-16 section-shell">
        <section className="border-b border-line pb-14">
          <MonoLabel size="sm" tone="muted" className="block">
            00 / COVER · DISMISS / V0.1
          </MonoLabel>
          <h1 className="font-display text-display-xl uppercase text-bone mt-6">
            School dismissal,
            <br />
            <span className="text-accent">engineered like a system.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-muted leading-relaxed">
            DismissFlow is a web-based student pickup &amp; digital dismissal
            system. A parent requests pickup, gate staff scans a temporary
            single-use QR, and the teacher makes the final release call. No
            paper, no refresh, no pickup cards.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Link
              href="/parent"
              className="h-12 px-5 inline-flex items-center gap-3 bg-accent text-white font-mono uppercase tracking-widest text-mono-sm font-semibold shadow-accent-glow hover:-translate-y-0.5 hover:bg-accent-deep transition-all"
            >
              Open Parent Portal
              <Icon name="arrow.right" className="h-4 w-4" strokeWidth={2} />
            </Link>
            <a
              href="https://github.com/risuhfoundry/DismissFlow-EPS"
              className="h-12 px-5 inline-flex items-center gap-3 hairline text-bone font-mono uppercase tracking-widest text-mono-sm font-semibold hover:bg-panel-alt transition-colors"
            >
              Source on GitHub
            </a>
          </div>
        </section>

        <section className="mt-14">
          <MonoLabel size="sm" tone="muted" className="block">
            01 / ROLES
          </MonoLabel>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-line">
            {ROLES.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="group bg-panel p-6 transition-colors hover:bg-panel-alt flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <MonoLabel size="xs" tone="muted">
                    ROLE {r.code}
                  </MonoLabel>
                  <Icon
                    name="arrow.right"
                    className="h-4 w-4 text-muted group-hover:text-accent transition-colors"
                  />
                </div>
                <h3 className="font-display text-2xl uppercase text-bone mt-8">
                  {r.label}
                </h3>
                <p className="mt-3 text-muted text-sm leading-relaxed">{r.blurb}</p>
              </Link>
            ))}
          </div>
        </section>

        <footer className="mt-16 border-t border-line pt-8 flex flex-wrap items-center justify-between gap-4">
          <MonoLabel size="xs" tone="muted">
            DISMISS / V0.1 / MIT — DISMISSFLOW EPS
          </MonoLabel>
          <MonoLabel size="xs" tone="muted">
            SUPABASE · NEXT.JS · REALTIME
          </MonoLabel>
        </footer>
      </main>
    </>
  );
}
