import clsx from "clsx";
import type { ReactNode } from "react";

// Mono caps label — Revora's signature metadata. Sizes mirror DESIGN.md.
export function MonoLabel({
  children,
  size = "sm",
  tone = "muted",
  className
}: {
  children: ReactNode;
  size?: "xs" | "sm" | "md";
  tone?: "muted" | "bone" | "accent" | "success" | "danger";
  className?: string;
}) {
  const sizeClass = {
    xs: "text-mono-xs",
    sm: "text-mono-sm",
    md: "text-mono-md"
  }[size];
  const toneClass = {
    muted: "text-muted",
    bone: "text-bone",
    accent: "text-accent",
    success: "text-success",
    danger: "text-danger"
  }[tone];

  return (
    <span
      className={clsx(
        "font-mono uppercase tracking-widest",
        sizeClass,
        toneClass,
        className
      )}
    >
      {children}
    </span>
  );
}
