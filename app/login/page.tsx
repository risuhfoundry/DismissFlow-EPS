"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { TopNav } from "@/components/ui/TopNav";
import { signInParent } from "@/lib/auth/parent-login";

function Eyebrow() {
  return (
    <span className="eyebrow">
      <i />
      00 / SIGN IN <span className="ml-1 px-1.5 py-0.5 border border-line text-mono-xs">V0.1</span>
    </span>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [admission, setAdmission] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await signInParent(admission, password);
      if (signInError) {
        setError("Sign in failed. Check your admission number and password.");
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

  return (
    <>
      <TopNav
        links={[{ label: "Parent", href: "/parent" }]}
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
          <Eyebrow />
          <h2 className="font-display text-display-md uppercase text-bone mt-4">
            Parent Sign In
          </h2>
          <p className="text-muted mt-3 leading-relaxed">
            Enter your child&apos;s admission number and the demo password (the
            admission number) to request dismissal.
          </p>

          <form onSubmit={handleSubmit} className="mt-8">
            <Panel withTopBar topBar={<span>01 / CREDENTIALS</span>}>
              <div className="p-7 flex flex-col gap-5">
                <label className="flex flex-col gap-2">
                  <MonoLabel size="xs" tone="muted">
                    ADMISSION NUMBER
                  </MonoLabel>
                  <input
                    type="text"
                    inputMode="text"
                    autoComplete="username"
                    value={admission}
                    onChange={(e) => setAdmission(e.target.value)}
                    placeholder="e.g. 040"
                    className="h-12 px-4 bg-ink text-bone border border-line rounded-none font-mono uppercase tracking-widest text-mono-md outline-none focus:border-accent transition-colors"
                  />
                </label>

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
                    className="h-12 px-4 bg-ink text-bone border border-line rounded-none font-mono uppercase tracking-widest text-mono-md outline-none focus:border-accent transition-colors"
                  />
                </label>

                {error && (
                  <p className="text-mono-sm font-mono uppercase tracking-widest text-danger">
                    {error}
                  </p>
                )}

                <PrimaryButton type="submit" disabled={loading} aria-label="Sign in">
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
