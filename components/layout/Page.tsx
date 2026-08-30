import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * Page — consistent content width + padding for every authenticated route.
 * Centres to `max-w-content` (1280px) with responsive horizontal padding.
 */
export function Page({
  children,
  className,
  title,
  description,
  actions,
  wide
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Use full width instead of the centred content column. */
  wide?: boolean;
}) {
  return (
    <div className={clsx(!wide && "mx-auto w-full max-w-content", "px-4 py-6 sm:px-6 lg:px-8 lg:py-8", className)}>
      {(title || actions) && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {title && <h1 className="text-h1 text-foreground">{title}</h1>}
            {description && (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

/** Section — a labelled grouping with consistent vertical rhythm. */
export function Section({
  id,
  title,
  description,
  action,
  children,
  className
}: {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={clsx("space-y-4", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-h3 text-foreground">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** CardGrid — responsive auto-fit grid for cards/stat tiles. */
export function CardGrid({
  children,
  cols = "auto",
  className
}: {
  children: ReactNode;
  cols?: "2" | "3" | "4" | "auto";
  className?: string;
}) {
  const colClass = {
    "2": "grid-cols-1 sm:grid-cols-2",
    "3": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    "4": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    auto: "grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  }[cols];
  return (
    <div className={clsx("grid gap-4", cols !== "auto" && colClass, className)} style={cols === "auto" ? undefined : undefined}>
      {children}
    </div>
  );
}

/** Stack — vertical flex column with consistent gap. */
export function Stack({
  children,
  gap = 4,
  className,
  align
}: {
  children: ReactNode;
  gap?: 2 | 3 | 4 | 6 | 8;
  className?: string;
  align?: "start" | "center" | "end" | "stretch";
}) {
  return (
    <div
      className={clsx(
        "flex flex-col",
        { 2: "gap-2", 3: "gap-3", 4: "gap-4", 6: "gap-6", 8: "gap-8" }[gap],
        align === "start" && "items-start",
        align === "center" && "items-center",
        align === "end" && "items-end",
        align === "stretch" && "items-stretch",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Inline — horizontal flex row with wrapping and consistent gap. */
export function Inline({
  children,
  gap = 3,
  className,
  wrap = true,
  align = "center"
}: {
  children: ReactNode;
  gap?: 2 | 3 | 4 | 6;
  className?: string;
  wrap?: boolean;
  align?: "start" | "center" | "end" | "between";
}) {
  return (
    <div
      className={clsx(
        "flex",
        wrap && "flex-wrap",
        { 2: "gap-2", 3: "gap-3", 4: "gap-4", 6: "gap-6" }[gap],
        align === "start" && "items-start",
        align === "center" && "items-center",
        align === "end" && "items-end",
        align === "between" && "items-center justify-between",
        className
      )}
    >
      {children}
    </div>
  );
}
