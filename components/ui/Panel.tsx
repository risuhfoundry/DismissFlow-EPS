import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * Panel — a neutral surface container with an optional top bar.
 * `hot` adds a subtle primary accent (use sparingly for emphasis).
 */
export function Panel({
  children,
  className,
  withTopBar,
  topBar,
  hot
}: {
  children: ReactNode;
  className?: string;
  withTopBar?: boolean;
  topBar?: ReactNode;
  hot?: boolean;
}) {
  return (
    <section
      className={clsx(
        "rounded-lg border bg-card shadow-card",
        hot ? "border-primary/40" : "border-border",
        className
      )}
    >
      {withTopBar && (
        <div className="flex items-center justify-between border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {topBar}
        </div>
      )}
      {children}
    </section>
  );
}
