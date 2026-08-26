"use client";

import clsx from "clsx";

// iOS-style "large title" navigation bar. Two-line header that collapses
// to a compact bar on scroll. Frosted glass + hairline bottom border.
export function NavHeader({
  title,
  leading,
  trailing,
  subtitle,
  compact = false
}: {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <header
      className={clsx(
        "sticky top-0 z-40 glass hairline-b",
        "pt-safe"
      )}
    >
      <div className="px-5">
        {/* Compact bar — always visible, holds leading/trailing controls. */}
        <div className="h-11 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            {leading}
          </div>
          <div className="flex items-center gap-2">{trailing}</div>
        </div>

        {/* Large title — collapses when compact is true. */}
        <div
          className={clsx(
            "overflow-hidden transition-all duration-300 ease-out",
            compact ? "max-h-0 opacity-0" : "max-h-24 opacity-100"
          )}
        >
          <h1 className="text-ios-large-title text-ink pb-2 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-ios-footnote text-ink-subtle -mt-1 pb-3">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
