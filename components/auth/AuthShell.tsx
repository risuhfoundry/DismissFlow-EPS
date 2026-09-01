"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Wordmark } from "@/components/layout/Brand";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSessionUser, type Role } from "@/lib/auth/session";

export interface AuthShellConfig {
  /** Application role, used for the post-sign-in role check and a11y. */
  role: Role;
  /** Human label shown in the role badge, e.g. "Parent". */
  roleLabel: string;
  /** Icon conveying the role context. */
  roleIcon: IconName;
  /** Primary heading. Must be the exact, role-mandated copy. */
  heading: string;
  /** Supporting description under the heading. */
  description: string;
  /** Identifier field label, e.g. "Admission number". */
  identifierLabel: string;
  /** Identifier placeholder. */
  identifierPlaceholder: string;
  /** HTML autocomplete token for the identifier. */
  identifierAutocomplete: string;
  /** Optional neutral helper text under the identifier field. */
  identifierHint?: string;
  /** Optional neutral helper text under the password field. */
  passwordHint?: string;
  /** Route to redirect to after a successful sign-in. */
  portal: string;
  /**
   * Performs the REAL authentication against the existing backend. Returns the
   * auth result so the shell can branch on `error`. The backend (Supabase Auth,
   * RLS, Edge Functions, session) is never touched by this component.
   */
  signIn: (
    identifier: string,
    password: string
  ) => Promise<{ error: { message: string } | null }>;
}

/**
 * Quiet, role-aware context for the identity panel. Each role gets its own
 * focal statement and three calm points — so the four entrances feel like
 * different doors to the same DismissFlow product, while sharing one visual
 * system. No fake data: these are honest descriptions of the role's place in
 * the workflow, not claims about customers or outcomes.
 */
const ROLE_CONTEXT: Record<Role, { statement: string; points: string[] }> = {
  parent: {
    statement: "Stay close to every pickup, from request to release.",
    points: [
      "Request a pickup in seconds",
      "Follow the status as it moves",
      "Collect your child with confidence"
    ]
  },
  teacher: {
    statement: "Decide each release once — and get back to teaching.",
    points: [
      "See only your students",
      "Approve or reject in a tap",
      "Keep the classroom settled"
    ]
  },
  gate: {
    statement: "Verify a child before they leave your care.",
    points: [
      "Scan to confirm a request",
      "A clear yes or no",
      "Every release recorded"
    ]
  },
  admin: {
    statement: "See the whole dismissal operation at a glance.",
    points: [
      "Oversight across every role",
      "Accounts and access",
      "A complete, lasting record"
    ]
  }
};

/**
 * One coherent premium authentication experience, shared by every role.
 *
 * Editorial split: a calm, role-aware identity panel beside a focused sign-in
 * form. The component owns only presentation and the generic error lifecycle;
 * it delegates all real authentication to the supplied `signIn`. After a
 * successful sign-in it re-checks the resolved role server-side and signs the
 * session out if it does not match the portal — preserving the existing
 * authorization behavior without the browser ever choosing a role.
 */
export function AuthShell(config: AuthShellConfig) {
  const {
    role,
    roleLabel,
    roleIcon,
    heading,
    description,
    identifierLabel,
    identifierPlaceholder,
    identifierAutocomplete,
    identifierHint,
    passwordHint,
    portal,
    signIn
  } = config;

  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [alreadyIn, setAlreadyIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const su = await getSessionUser(supabase);
      if (!cancelled && su?.role === role) setAlreadyIn(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, role]);

  const roleCtx = ROLE_CONTEXT[role];

  // Generic, account-existence-safe messages.
  const authFailed = `Invalid ${identifierLabel.toLowerCase()} or password.`;
  const notAuthorized = "This account isn't authorized for this portal.";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    const idErr = identifier.trim()
      ? null
      : `Enter your ${identifierLabel.toLowerCase()}.`;
    const pwErr = password ? null : "Enter your password.";
    setIdentifierError(idErr);
    setPasswordError(pwErr);
    if (idErr || pwErr) {
      setError(null);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await signIn(identifier.trim(), password);
      if (signInError) {
        setError(authFailed);
        return;
      }
      const su = await getSessionUser(supabase);
      if (!su || su.role !== role) {
        await supabase.auth.signOut();
        setError(notAuthorized);
        return;
      }
      router.push(portal);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const errorId = "auth-error";
  const identifierHintId = "auth-identifier-hint";
  const identifierErrorId = "auth-identifier-error";
  const passwordErrorId = "auth-password-error";

  const identifierDescribedBy =
    [
      identifierHint && !identifierError && !error ? identifierHintId : null,
      identifierError ? identifierErrorId : null,
      error ? errorId : null
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const passwordDescribedBy =
    [passwordError ? passwordErrorId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <main className="flex min-h-screen flex-col bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Identity panel — calm, editorial, role-aware. Hidden on small screens. */}
      <aside className="relative hidden overflow-hidden bg-surface-subtle lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(55% 45% at 12% 0%, var(--color-primary-soft) 0%, transparent 70%)"
          }}
        />
        <Link href="/" className="inline-flex w-fit" aria-label="DismissFlow home">
          <Wordmark />
        </Link>

        <div className="max-w-md">
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary"
            aria-hidden="true"
          >
            <Icon name={roleIcon} className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <p className="eyebrow mt-7 inline-flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-primary"
              aria-hidden="true"
            />
            Signing in as {roleLabel}
          </p>
          <h1 className="mt-4 font-serif text-display font-semibold leading-[1.06] text-foreground">
            {roleCtx.statement}
          </h1>
          <ul className="mt-8 space-y-3">
            {roleCtx.points.map((p) => (
              <li
                key={p}
                className="flex items-center gap-3 text-sm text-foreground"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Icon name="check" className="h-4 w-4" strokeWidth={2} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          © 2026 DismissFlow. Access is by school-issued credentials.
        </p>
      </aside>

      {/* Form column */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <div
          className={`w-full max-w-md ${alreadyIn ? "pointer-events-none opacity-50" : ""}`}
        >
          <Link
            href="/"
            className="mb-8 flex items-center lg:hidden"
            aria-label="DismissFlow home"
          >
            <Wordmark />
          </Link>

          <div className="animate-fade-in">
            <Card tone="default" className="border-border bg-card p-6 shadow-card sm:p-8">
              {/* Role context */}
              <div className="mb-6 flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon name={roleIcon} className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {roleLabel}
                </span>
                <span className="ml-auto text-xs font-medium text-muted-foreground">
                  Sign in
                </span>
              </div>

              <h2 className="font-serif text-h1 font-semibold leading-tight text-foreground">
                {heading}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>

              {alreadyIn && (
                <Alert tone="info" className="mt-6">
                  <span>You&rsquo;re already signed in.</span>{" "}
                  <Link
                    href={portal}
                    className="font-medium text-primary underline underline-offset-4"
                  >
                    Go to your dashboard
                  </Link>
                </Alert>
              )}

              <form
                onSubmit={handleSubmit}
                className="mt-6 flex flex-col gap-5"
                noValidate
              >
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="auth-identifier"
                    className="text-label font-medium text-foreground"
                  >
                    {identifierLabel}
                  </label>
                  <Input
                    id="auth-identifier"
                    type="text"
                    autoFocus
                    autoComplete={identifierAutocomplete}
                    value={identifier}
                    disabled={loading}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (identifierError) setIdentifierError(null);
                      if (error) setError(null);
                    }}
                    placeholder={identifierPlaceholder}
                    invalid={!!identifierError || !!error}
                    aria-describedby={identifierDescribedBy}
                    className="h-11 text-base"
                  />
                  {identifierHint && !identifierError && !error && (
                    <p id={identifierHintId} className="text-xs text-muted-foreground">
                      {identifierHint}
                    </p>
                  )}
                  {identifierError && (
                    <p
                      id={identifierErrorId}
                      className="text-xs font-medium text-destructive"
                    >
                      {identifierError}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="auth-password"
                    className="text-label font-medium text-foreground"
                  >
                    Password
                  </label>
                  <PasswordInput
                    id="auth-password"
                    autoComplete="current-password"
                    value={password}
                    disabled={loading}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                      if (error) setError(null);
                    }}
                    placeholder="Your password"
                    invalid={!!passwordError || !!error}
                    aria-describedby={passwordDescribedBy}
                    className="h-11 text-base"
                  />
                  {passwordHint && !passwordError && !error && (
                    <p
                      id="auth-password-hint"
                      className="text-xs text-muted-foreground"
                    >
                      {passwordHint}
                    </p>
                  )}
                  {passwordError && (
                    <p
                      id={passwordErrorId}
                      className="text-xs font-medium text-destructive"
                    >
                      {passwordError}
                    </p>
                  )}
                </div>

                {error && (
                  <Alert tone="danger" id={errorId}>
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  aria-busy={loading || undefined}
                  aria-label="Sign in"
                  className="mt-1 w-full"
                >
                  {loading ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Signing in&hellip;
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </Card>

            {/* Plain role switcher — every sign-in page links to all four. */}
            <nav
              aria-label="Sign in as a different role"
              className="mt-5 flex flex-wrap items-center justify-center gap-2"
            >
              {(
                [
                  { key: "parent", label: "Parent", href: "/login" },
                  { key: "teacher", label: "Teacher", href: "/login/teacher" },
                  { key: "gate", label: "Gate", href: "/login/gate" },
                  { key: "admin", label: "Admin", href: "/login/admin" }
                ] as const
              ).map((r) =>
                r.key === role ? (
                  <span
                    key={r.key}
                    aria-current="page"
                    className="inline-flex items-center rounded-full bg-primary-soft px-3.5 py-1.5 text-sm font-medium text-primary"
                  >
                    {r.label}
                  </span>
                ) : (
                  <Link
                    key={r.key}
                    href={r.href}
                    className="inline-flex items-center rounded-full border border-border px-3.5 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:border-primary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Sign in as {r.label}
                  </Link>
                )
              )}
            </nav>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Icon name="lock" className="h-4 w-4" strokeWidth={1.8} />
              <span>Secured with your school-issued credentials.</span>
            </div>

            <div className="mt-4 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon name="chevron.left" className="h-4 w-4" strokeWidth={1.8} />
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
