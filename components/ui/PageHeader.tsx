import clsx from "clsx";
import type { ReactNode } from "react";
import { Badge } from "./Badge";

/**
 * PageHeader — consistent page title block: eyebrow (kicker) + <h1> + optional
 * description and badge. One shape for every future role page.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
  className
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  badge?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={clsx("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-h1 text-foreground">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {badge && <Badge tone="neutral">{badge}</Badge>}
        {actions}
      </div>
    </header>
  );
}

/** Section kicker used to label groups within a page. */
export function SectionLabel({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={clsx("eyebrow", className)}>{children}</p>;
}
