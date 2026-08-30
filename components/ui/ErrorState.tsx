import type { ReactNode } from "react";
import { Icon } from "./Icon";

/** Error state for a page or panel region, with optional retry action. */
export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center " +
        (className ?? "")
      }
      role="alert"
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive-soft text-destructive">
        <Icon name="alert" className="h-6 w-6" />
      </span>
      <div>
        <p className="text-base font-semibold text-foreground">{title}</p>
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
