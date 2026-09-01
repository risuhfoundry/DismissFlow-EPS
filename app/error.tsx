"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/layout/Brand";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/**
 * Application-level error boundary. Catches render-time failures in a route
 * segment and presents a calm, on-brand recovery state — no stack traces, no
 * Supabase internals, no database IDs. Resetting the boundary re-renders the
 * segment; if that fails again the user can return home.
 */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced to monitoring only. Never render the raw error to the user.
    console.error("Application error:", error?.message);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex" aria-label="DismissFlow home">
          <Wordmark />
        </Link>

        <span className="mt-10 inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive-soft text-destructive">
          <Icon name="alert" className="h-6 w-6" strokeWidth={2} />
        </span>
        <h1 className="mt-4 font-serif text-h2 font-semibold text-foreground">
          Something went wrong
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          This screen hit an unexpected problem. Your session and data are safe.
          You can try again, or return to a known-good page.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            onClick={reset}
            leftIcon={<Icon name="refresh" className="h-4 w-4" strokeWidth={2} />}
          >
            Try again
          </Button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Back to home
            <Icon name="chevron.right" className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </main>
  );
}
