import clsx from "clsx";
import type { ReactNode } from "react";
import { Skeleton } from "./Skeleton";

/**
 * Stat — a single metric tile. `label` + `value` are the minimum; pass
 * `hint`/`trend`/`icon` for richer cards. Kept as `Stat` for existing call
 * sites plus a `StatCard` alias for the canonical surface.
 */
export function Stat({
  label,
  value,
  hint,
  trend,
  icon,
  loading,
  accent,
  className
}: {
  label: ReactNode;
  value?: ReactNode;
  hint?: ReactNode;
  trend?: { value: string; direction: "up" | "down" | "flat"; tone?: "success" | "danger" | "neutral" };
  icon?: ReactNode;
  loading?: boolean;
  /** Backward-compatible emphasis flag (value rendered in the primary color). */
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx("rounded-lg border border-border bg-card p-5 shadow-card", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={clsx(
              "text-2xl font-semibold tabular",
              accent ? "text-primary" : "text-foreground"
            )}
          >
            {value}
          </span>
          {trend && (
            <span
              className={clsx(
                "text-xs font-medium",
                trend.tone === "success" && "text-success",
                trend.tone === "danger" && "text-destructive",
                (!trend.tone || trend.tone === "neutral") && "text-muted-foreground"
              )}
            >
              {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "■"}{" "}
              {trend.value}
            </span>
          )}
        </div>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Alias used by the new foundation for a card-style stat. */
export const StatCard = Stat;
