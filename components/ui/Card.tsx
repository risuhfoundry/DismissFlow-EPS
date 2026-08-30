import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

/**
 * Card — the primary elevated surface. Compose with CardHeader / CardTitle /
 * CardDescription / CardContent / CardFooter, or use bare with padding.
 *
 * `tone` provides a consistent visual language:
 *   default     — neutral surface (default)
 *   interactive — hover lift, used for clickable cards
 *   selected    — primary ring for a chosen card
 *   danger      — destructive emphasis
 *   success     — positive emphasis
 *   muted       — recessed / disabled-feeling surface
 *   soft        — subtle tinted surface (surface-subtle)
 */
export type CardTone =
  | "default"
  | "interactive"
  | "selected"
  | "danger"
  | "success"
  | "muted"
  | "soft";

const TONES: Record<CardTone, string> = {
  default: "border-border bg-card shadow-card",
  interactive:
    "border-border bg-card shadow-card transition-shadow duration-150 hover:shadow-popover hover:border-border-strong",
  selected:
    "border-primary/60 bg-card shadow-card ring-1 ring-primary/40",
  danger: "border-destructive/40 bg-destructive-soft shadow-card",
  success: "border-success/40 bg-success-soft shadow-card",
  muted: "border-border bg-surface-subtle shadow-none",
  soft: "border-transparent bg-surface-subtle shadow-none"
};

export function Card({
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: CardTone }) {
  return (
    <div
      className={clsx("rounded-xl", TONES[tone], className)}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  title,
  description,
  action,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex items-start justify-between gap-4 border-b border-border px-5 py-4",
        className
      )}
      {...props}
    >
      <div className="min-w-0">
        {title && (
          <h3 className="text-title font-semibold text-foreground">{title}</h3>
        )}
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={clsx("text-title font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={clsx("text-sm text-muted-foreground", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("px-5 py-4", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "flex items-center gap-3 border-t border-border px-5 py-4",
        className
      )}
      {...props}
    />
  );
}
