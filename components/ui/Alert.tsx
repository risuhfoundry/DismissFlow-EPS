import clsx from "clsx";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

// Inline alert for errors / warnings / confirmations (form errors, action
// failures, conflict notices). Announced to screen readers via role="alert".
// Replaces the bare <p className="text-danger font-mono uppercase"> blocks.
export function Alert({
  tone = "danger",
  children,
  className,
  id
}: {
  tone?: "danger" | "warn" | "info";
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const toneClass = {
    danger: "text-danger border-danger/40",
    warn: "text-warn border-warn/40",
    info: "text-accent border-accent/40"
  }[tone];
  const icon = tone === "danger" ? "x" : tone === "warn" ? "timer" : "scan";
  return (
    <p
      id={id}
      role="alert"
      aria-live="assertive"
      className={clsx(
        "flex items-start gap-2 border bg-ink/60 px-4 py-3 font-mono uppercase tracking-widest text-mono-sm leading-relaxed",
        toneClass,
        className
      )}
    >
      <Icon name={icon} className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={2} />
      <span>{children}</span>
    </p>
  );
}
