import clsx from "clsx";
import type { ReactNode } from "react";
import { MonoLabel } from "./MonoLabel";

// Page header — one consistent shape for every route: a mono eyebrow (with the
// blue tick + optional version badge), a single <h1> (display scale), and an
// optional description. Fixes the previous inconsistency where pages mixed the
// `.eyebrow` helper with bare <h2> headings, which broke heading hierarchy.
export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  className
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  badge?: string;
  className?: string;
}) {
  return (
    <header className={clsx("border-b border-line pb-8", className)}>
      <span className="eyebrow">
        <i />
        {eyebrow}
        {badge && (
          <span className="ml-1 px-1.5 py-0.5 border border-line text-mono-xs">
            {badge}
          </span>
        )}
      </span>
      <h1 className="font-display text-display-md uppercase text-bone mt-4 leading-none">
        {title}
      </h1>
      {description && (
        <p className="mt-4 max-w-2xl text-muted leading-relaxed">{description}</p>
      )}
    </header>
  );
}

// A smaller section kicker used to label panels / groups within a page.
export function SectionLabel({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <MonoLabel size="xs" tone="muted" className={className}>
      {children}
    </MonoLabel>
  );
}
