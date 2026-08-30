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
 * One coherent production authentication experience, shared by every role.
 *
 * The component owns only presentation + the generic error lifecycle; it delegates
 * all real authentication to the supplied `signIn` (which calls the existing
 * parent/staff login modules). After a successful sign-in it re-checks the
 * resolved role server-side and signs the session out if it does not match the
 * portal — preserving the existing authorization behavior without the browser
 * ever choosing a role.
 *
 * Error UX: an authentication error is cleared the moment the user edits either
 * field, so stale errors never linger while typing.
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

  // Generic, account-existence-safe messages.
  const authFailed = `Invalid ${identifierLabel.toLowerCase()} or password.`;
  const notAuthorized = "This account isn't authorized for this portal.";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await signIn(identifier.trim(), password);
      if (signInError) {
        setError(authFailed);
        return;
      }
      // Server-derived role must match the portal. The browser never asserts a
      // role; if a valid account landed on the wrong portal we sign it out
      // rather than letting it escalate.
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
  const passwordHintId = "auth-password-hint";

  const identifierDescribedBy =
    [identifierHint && !error ? identifierHintId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const passwordDescribedBy =
    [passwordHint && !error ? passwordHintId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center"
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
              <span className="ml-auto text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Sign in
              </span>
            </div>

            <h1 className="text-h2 font-semibold leading-tight text-foreground">
              {heading}
            </h1>
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
              className={`mt-6 flex flex-col gap-5 ${alreadyIn ? "pointer-events-none opacity-50" : ""}`}
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
                  autoComplete={identifierAutocomplete}
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={identifierPlaceholder}
                  invalid={!!error}
                  aria-describedby={identifierDescribedBy}
                  className="h-11 text-base"
                />
                {identifierHint && !error && (
                  <p id={identifierHintId} className="text-xs text-muted-foreground">
                    {identifierHint}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Your password"
                  invalid={!!error}
                  aria-describedby={passwordDescribedBy}
                  className="h-11 text-base"
                />
                {passwordHint && !error && (
                  <p id={passwordHintId} className="text-xs text-muted-foreground">
                    {passwordHint}
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
                  "Sign In"
                )}
              </Button>
            </form>
          </Card>

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
    </main>
  );
}
