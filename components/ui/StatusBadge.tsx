import clsx from "clsx";
import type { ReactNode } from "react";

export type StatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "primary";

const TONES: Record<StatusTone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  info: "bg-info-soft text-info-on-soft",
  success: "bg-success-soft text-success-on-soft",
  warning: "bg-warning-soft text-warning-on-soft",
  danger: "bg-destructive-soft text-destructive-on-soft",
  primary: "bg-primary-soft text-primary-on-soft"
};

const DOT: Record<StatusTone, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  primary: "bg-primary"
};

/**
 * StatusBadge — for workflow / record states (pending, approved, waiting…).
 * `pulse` adds a gentle live indicator for active states.
 */
export function StatusBadge({
  tone = "neutral",
  children,
  pulse,
  className
}: {
  tone?: StatusTone;
  children: ReactNode;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className
      )}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          DOT[tone],
          pulse && "animate-pulse-soft"
        )}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
