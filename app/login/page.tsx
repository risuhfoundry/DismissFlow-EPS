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
import { signInParent } from "@/lib/auth/parent-login";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [admission, setAdmission] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyIn, setAlreadyIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const su = await getSessionUser(supabase);
      if (!cancelled && su?.role === "parent" && su.linkedStudentId) {
        setAlreadyIn(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await signInParent(admission, password);
      if (signInError) {
        setError("Invalid admission number or password.");
        return;
      }
      router.push("/parent");
      router.refresh();
    } catch {
      setError("Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const errorId = "login-error";

  return (
    <>
      <TopNav
        links={[{ label: "Parent", href: "/parent" }]}
        trailing={<VersionTag />}
      />

      <main className="pt-24 pb-16 section-shell">
        <div className="max-w-md mx-auto">
          <PageHeader
            eyebrow="00 / SIGN IN"
            title="Parent Sign In"
            description="Enter your child's admission number and the demo password (the admission number) to request dismissal."
          />

          {alreadyIn && (
            <div className="mt-8">
              <Alert tone="info">
                <span>You are already signed in.</span>{" "}
                <Link href="/parent" className="text-accent underline underline-offset-4">
                  Go to your dashboard
                </Link>
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className={`mt-8 ${alreadyIn ? "opacity-50 pointer-events-none" : ""}`}>
            <Panel withTopBar topBar={<span>01 / CREDENTIALS</span>}>
              <div className="p-7 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="admission" className="contents">
                    <MonoLabel size="xs" tone="muted">
                      ADMISSION NUMBER
                    </MonoLabel>
                  </label>
                  <Input
                    id="admission"
                    type="text"
                    inputMode="text"
                    autoComplete="username"
                    value={admission}
                    onChange={(e) => setAdmission(e.target.value)}
                    placeholder="e.g. 040"
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
                    placeholder="demo password"
                    invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                  />
                </div>

                {error && <Alert tone="danger" id={errorId}>{error}</Alert>}

                <PrimaryButton type="submit" disabled={loading} loading={loading} aria-label="Sign in">
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
