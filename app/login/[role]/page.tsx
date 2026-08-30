"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { PrimaryButton } from "@/components/ui/Button";
import { TopNav } from "@/components/ui/TopNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { VersionTag } from "@/components/ui/VersionTag";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth/session";
import { signInById, type StaffRole } from "@/lib/auth/role-login";

// Single sign-in surface for the staff roles. The route segment is the role
// itself; the page authenticates against the corresponding demo Auth account
// and routes the user to their portal. Parents use the dedicated /login flow
// (admission number -> email mapping) at app/login/page.tsx.

const ROLE_META: Record<StaffRole, { code: string; title: string; blurb: string; portal: string; idLabel: string; idHint: string }> = {
  teacher: {
    code: "03",
    title: "Teacher Sign In",
    blurb: "Sign in with your staff ID and password to see your class pickup queue.",
    portal: "/teacher",
    idLabel: "STAFF ID",
    idHint: "your assigned staff ID"
  },
  gate: {
    code: "02",
    title: "Gate Sign In",
    blurb: "Sign in with your gate ID and password to open the camera scanner.",
    portal: "/gate",
    idLabel: "GATE ID",
    idHint: "your assigned gate ID"
  },
  admin: {
    code: "04",
    title: "Admin Sign In",
    blurb: "Sign in with your admin ID and password to review the roster and logs.",
    portal: "/admin",
    idLabel: "ADMIN ID",
    idHint: "your assigned admin ID"
  }
};

function isStaffRole(value: string): value is StaffRole {
  return value === "teacher" || value === "gate" || value === "admin";
}

export default function StaffLoginPage({ params }: { params: { role: string } }) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const role: StaffRole | null = isStaffRole(params.role) ? params.role : null;
  const meta = role ? ROLE_META[role] : null;

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyIn, setAlreadyIn] = useState(false);

  useEffect(() => {
    if (!role) return;
    let cancelled = false;
    (async () => {
      const su = await getSessionUser(supabase);
      if (!cancelled && su?.role === role) {
        setAlreadyIn(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, role]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading || !role) return;
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await signInById(role, loginId, password);
      if (signInError) {
        setError("Invalid ID or password for this account.");
        return;
      }
      // Server-derived role must match the portal the user signed into. The
      // browser never chooses the role — if a person used the wrong portal, we
      // sign them out and refuse rather than let them escalate.
      const su = await getSessionUser(supabase);
      if (!su || su.role !== role) {
        await supabase.auth.signOut();
        setError(`This ${ROLE_META[role].idLabel.toLowerCase()} is not registered as a ${role}.`);
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
        <h1 className="font-display text-display-md uppercase text-bone mt-4">
          Not a sign-in page
        </h1>
        <p className="text-muted mt-3">
          Visit <Link className="text-accent" href="/login">the parent sign-in</Link> or
          pick a role from <Link className="text-accent" href="/">the home page</Link>.
        </p>
      </main>
    );
  }

  const errorId = "staff-login-error";

  return (
    <>
      <TopNav
        links={[{ label: "Home", href: "/" }]}
        trailing={<VersionTag />}
      />

      <main className="pt-24 pb-16 section-shell">
        <div className="max-w-md mx-auto">
          <PageHeader
            eyebrow={`${meta.code} / ${role.toUpperCase()} SIGN IN`}
            title={meta.title}
            description={meta.blurb}
          />

          {alreadyIn && (
            <div className="mt-8">
              <Alert tone="info">
                <span>You are already signed in.</span>{" "}
                <Link href={meta.portal} className="text-accent underline underline-offset-4">
                  Go to your portal
                </Link>
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className={`mt-8 ${alreadyIn ? "opacity-50 pointer-events-none" : ""}`}>
            <Panel withTopBar topBar={<span>01 / CREDENTIALS</span>}>
              <div className="p-7 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="loginId" className="contents">
                    <MonoLabel size="xs" tone="muted">
                      {meta.idLabel}
                    </MonoLabel>
                  </label>
                  <Input
                    id="loginId"
                    type="text"
                    autoComplete="username"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder={meta.idHint}
                    invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="password" className="contents">
                    <MonoLabel size="xs" tone="muted">
                      PASSWORD
                    </MonoLabel>
                  </label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="your password"
                    invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                  />
                </div>

                {error && <Alert tone="danger" id={errorId}>{error}</Alert>}

                <PrimaryButton type="submit" disabled={loading} loading={loading} aria-label={`Sign in as ${role}`}>
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
