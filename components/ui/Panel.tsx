import clsx from "clsx";
import type { ReactNode } from "react";

// Revora-style panel — square corners, hairline 1px border, dark fill,
// optional top-bar with mono caps. Use for any card.
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
    <div
      className={clsx(
        "bg-panel",
        hot ? "hairline-hot" : "hairline",
        "shadow-panel",
        className
      )}
    >
      {withTopBar && (
        <div className="h-12 flex items-center justify-between px-4 border-b border-line text-mono-sm font-mono text-muted uppercase tracking-wider">
          {topBar}
        </div>
      )}
      {children}
    </div>
  );
}
