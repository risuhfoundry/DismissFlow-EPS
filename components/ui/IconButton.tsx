"use client";

import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonVariant = "ghost" | "outline" | "subtle" | "danger";
type IconButtonSize = "sm" | "md" | "lg";

const SIZES: Record<IconButtonSize, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-11 w-11"
};

const VARIANTS: Record<IconButtonVariant, string> = {
  ghost: "text-secondary-foreground hover:bg-muted",
  outline: "border border-border text-foreground hover:bg-muted",
  subtle: "bg-secondary text-secondary-foreground hover:bg-border/60",
  danger:
    "text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/40"
};

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Required for accessibility — icon-only buttons need a label. */
  ariaLabel: string;
  loading?: boolean;
}

export function IconButton({
  children,
  variant = "ghost",
  size = "md",
  ariaLabel,
  loading = false,
  disabled,
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center rounded-md transition-colors duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:opacity-50 disabled:pointer-events-none",
        SIZES[size],
        VARIANTS[variant],
        className
      )}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  );
}
