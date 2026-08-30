import clsx from "clsx";
import type { ReactNode } from "react";

type Tone = "neutral" | "muted" | "accent" | "success" | "danger" | "bone";

const TONES: Record<Tone, string> = {
  neutral: "text-foreground",
  muted: "text-muted-foreground",
  accent: "text-primary",
  success: "text-success",
  danger: "text-destructive",
  bone: "text-foreground"
};

/**
 * Small caption / metadata label. Kept for existing call sites; intentionally
 * subtle (no heavy mono, no glow) to fit the calm foundation style.
 */
export function MonoLabel({
  children,
  size = "sm",
  tone = "muted",
  className,
  uppercase = false
}: {
  children: ReactNode;
  size?: "xs" | "sm";
  tone?: Tone;
  className?: string;
  uppercase?: boolean;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-medium",
        size === "xs" ? "text-xs" : "text-sm",
        TONES[tone],
        uppercase && "uppercase tracking-wide",
        className
      )}
    >
      {children}
    </span>
  );
}
