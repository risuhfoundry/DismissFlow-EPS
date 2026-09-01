import Link from "next/link";
import { Wordmark } from "@/components/layout/Brand";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/**
 * Global not-found experience. Rendered within the root layout (outside any role
 * shell) for unmatched routes — calm, on-brand, with a real route back home.
 * No developer jargon, no joke copy, no stack traces.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex" aria-label="DismissFlow home">
          <Wordmark />
        </Link>

        <p className="eyebrow mt-10">Page not found</p>
        <h1 className="mt-3 font-serif text-h1 font-semibold text-foreground">
          We couldn&rsquo;t find that page
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          The link may be out of date or the page may have moved. Let&rsquo;s get
          you back to a place that works.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/">
            <Button size="lg" leftIcon={<Icon name="home" className="h-4 w-4" strokeWidth={2} />}>
              Back to home
            </Button>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Go to sign in
            <Icon name="chevron.right" className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </main>
  );
}
