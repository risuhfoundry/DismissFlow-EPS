import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Alert } from "@/components/ui/Alert";

/**
 * Shared, design-system-aligned presentational helpers for the Admin portal.
 * These never fetch data or hold authorization logic — pages own the queries
 * and pass plain values in. Kept under app/admin so they are not promoted to a
 * generic role primitive.
 */

/** A labelled search box with a leading search glyph. */
export function SearchField({
  id,
  label,
  value,
  onChange,
  placeholder
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-80">
      <label htmlFor={id} className="text-label font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
    </div>
  );
}

/** Prev/Next pagination control. Renders nothing when there is a single page. */
export function Pager({
  page,
  pageCount,
  onPage,
  total
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  total: number;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
      <p className="text-xs text-muted-foreground tabular-nums">
        {total} total · page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          leftIcon={<Icon name="chevron.left" className="h-4 w-4" strokeWidth={2} />}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
          rightIcon={<Icon name="chevron.right" className="h-4 w-4" strokeWidth={2} />}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

/** A number + label tile for overview statistics. All values are real counts. */
export function StatTile({
  label,
  value,
  accent,
  hint
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={`mt-1.5 text-3xl font-semibold tabular-nums ${
            accent ? "text-primary" : "text-foreground"
          }`}
        >
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** Reusable access/role guard block for client pages. */
export function AccessNote({
  tone,
  message,
  signInHref,
  signInLabel
}: {
  tone: "info" | "warning";
  message: string;
  signInHref: string;
  signInLabel: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-8">
        <Alert tone={tone}>{message}</Alert>
        <div>
          <Link
            href={signInHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {signInLabel}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
