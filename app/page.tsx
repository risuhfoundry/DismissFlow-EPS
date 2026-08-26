import Link from "next/link";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

const ROLES = [
  { href: "/parent", label: "Parent", tone: "from-indigo-50 to-white" },
  { href: "/gate", label: "Gate", tone: "from-amber-50 to-white" },
  { href: "/teacher", label: "Teacher", tone: "from-emerald-50 to-white" },
  { href: "/admin", label: "Admin", tone: "from-rose-50 to-white" }
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-5 pt-safe pb-safe flex flex-col">
      <header className="pt-16 pb-12">
        <p className="text-ios-caption-1 uppercase tracking-wide text-ink-subtle font-semibold">
          DismissFlow
        </p>
        <h1 className="text-ios-large-title text-ink mt-1">
          Choose a role
        </h1>
        <p className="text-ios-subhead text-ink-subtle mt-2 max-w-sm">
          A web-based student dismissal &amp; digital pickup system.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {ROLES.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="rounded-2xl bg-surface p-5 shadow-card-soft border border-hairline tap-spring"
          >
            <p className="text-ios-caption-1 uppercase tracking-wider text-ink-subtle font-semibold">
              Role
            </p>
            <p className="text-ios-title-2 text-ink mt-1">{r.label}</p>
            <p className="text-ios-footnote text-ink-subtle mt-2">
              Open {r.label.toLowerCase()} portal →
            </p>
          </Link>
        ))}
      </div>

      <footer className="mt-auto pt-10">
        <PrimaryButton disabled>Start Prototype (coming soon)</PrimaryButton>
        <p className="text-ios-caption-1 text-ink-subtle text-center mt-3">
          See <code className="font-mono">Docs/architecture.md</code>.
        </p>
      </footer>
    </main>
  );
}
