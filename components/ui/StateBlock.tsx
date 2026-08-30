import clsx from "clsx";
import type { ReactNode } from "react";
import { Spinner } from "./Spinner";
import { Icon, type IconName } from "./Icon";

/** Centered loading state for a page or panel region. */
export function LoadingState({
  label = "Loading…",
  message,
  className
}: {
  label?: string;
  /** Backward-compatible alias for `label`. */
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Spinner className="h-6 w-6" />
      <p className="text-sm">{message ?? label}</p>
    </div>
  );
}

/** Empty state with optional icon, action, and helper text. */
export function EmptyState({
  icon = "inbox",
  title,
  message,
  description,
  action,
  className
}: {
  icon?: IconName;
  title?: string;
  /** Backward-compatible alias for `title`. */
  message?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className
      )}
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <div>
        <p className="text-base font-semibold text-foreground">{title ?? message}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
