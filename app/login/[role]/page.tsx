"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { TopNav } from "@/components/ui/TopNav";
import { signInStaff, type StaffRole } from "@/lib/auth/role-login";

// Single sign-in surface for the staff roles. The route segment is the role
// itself; the page authenticates against the corresponding demo Auth account
// and routes the user to their portal. Parents use the dedicated /login flow
// (admission number -> email mapping) at app/login/page.tsx.

const ROLE_META: Record<StaffRole, { code: string; title: string; blurb: string; portal: string }> = {
  teacher: {
    code: "03",
    title: "Teacher Sign In",
    blurb:
      "Sign in with the teacher demo account to see the Tulip pickup queue.",
    portal: "/teacher"
  },
  gate: {
    code: "02",
    title: "Gate Sign In",
    blurb:
      "Sign in with the gate demo account to open the camera scanner.",
    portal: "/gate"
  },
  admin: {
    code: "04",
    title: "Admin Sign In",
    blurb:
      "Sign in with the admin demo account to review the roster and logs.",
    portal: "/admin"
  }
};

function isStaffRole(value: string): value is StaffRole {
  return value === "teacher" || value === "gate" || value === "admin";
}

export default function StaffLoginPage({ params }: { params: { role: string } }) {
  const router = useRouter();
  const role: StaffRole | null = isStaffRole(params.role) ? params.role : null;
  const meta = role ? ROLE_META[role] : null;

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading || !role) return;
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await signInStaff(role, password);
      if (signInError) {
        setError("Sign in failed. Check the demo password.");
        return;
      }
      router.push(ROLE_META[role].portal);
      router.refresh();
    } catch {
      setError("Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!role || !meta) {
    return (
      <main className="pt-32 pb-16 section-shell max-w-md mx-auto">
        <MonoLabel size="sm" tone="muted">
          UNKNOWN ROLE
        </MonoLabel>
        <h2 className="font-display text-display-md uppercase text-bone mt-4">
          Not a sign-in page
        </h2>
        <p className="text-muted mt-3">
          Visit <Link className="text-accent" href="/login">the parent sign-in</Link> or
          pick a role from <Link className="text-accent" href="/">the home page</Link>.
        </p>
      </main>
    );
  }

  return (
    <>
      <TopNav
        links={[{ label: "Home", href: "/" }]}
        trailing={
          <div className="flex items-center gap-2 hairline bg-panel px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_#B7EF42] animate-pulse-dot" />
            <MonoLabel size="xs" tone="bone">
              DISMISS / V0.1
            </MonoLabel>
          </div>
        }
      />

      <main className="pt-24 pb-16 section-shell">
        <div className="max-w-md mx-auto">
          <span className="eyebrow">
            <i />
            {meta.code} / {role.toUpperCase()} SIGN IN
          </span>
          <h2 className="font-display text-display-md uppercase text-bone mt-4">
            {meta.title}
          </h2>
          <p className="text-muted mt-3 leading-relaxed">{meta.blurb}</p>

          <form onSubmit={handleSubmit} className="mt-8">
            <Panel withTopBar topBar={<span>01 / CREDENTIALS</span>}>
              <div className="p-7 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <MonoLabel size="xs" tone="muted">
                    EMAIL
                  </MonoLabel>
                  <div className="h-12 px-4 flex items-center bg-ink border border-line font-mono uppercase tracking-widest text-mono-sm text-muted">
                    {role}@demo.dismissflow
                  </div>
                </div>
                <label className="flex flex-col gap-2">
                  <MonoLabel size="xs" tone="muted">
                    PASSWORD
                  </MonoLabel>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="demo password"
                    className="h-12 px-4 bg-ink text-bone border border-line rounded-none font-mono uppercase tracking-widest text-mono-sm outline-none focus:border-accent transition-colors"
                  />
                </label>

                {error && (
                  <p className="text-mono-sm font-mono uppercase tracking-widest text-danger">
                    {error}
                  </p>
                )}

                <PrimaryButton type="submit" disabled={loading} aria-label={`Sign in as ${role}`}>
                  {loading ? (
                    <>
                      <Icon name="timer" className="h-4 w-4" strokeWidth={2} />
                      Signing in…
                    </>
                  ) : (
                    <>
                      <Icon name="arrow.right" className="h-4 w-4" strokeWidth={2} />
                      Sign In
                    </>
                  )}
                </PrimaryButton>
              </div>
            </Panel>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="font-mono uppercase tracking-widest text-mono-sm text-muted hover:text-bone transition-colors"
            >
              ← Back to overview
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
