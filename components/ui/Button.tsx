"use client";

import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";

/**
 * DismissFlow button system.
 *
 * Variants: primary | secondary | outline | ghost | danger
 * Sizes:    sm | md | lg
 * States:   default / hover / active / focus-visible / disabled / loading.
 *
 * Loading buttons set `aria-busy` and disable pointer events so a second
 * submit cannot fire (prevents duplicate submission).
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 select-none font-medium " +
  "rounded-md transition-colors duration-150 ease-standard " +
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:opacity-50 disabled:pointer-events-none";

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base"
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:bg-primary-active",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-border/70 border border-border",
  outline:
    "bg-transparent text-foreground border border-border hover:bg-muted",
  ghost: "bg-transparent text-secondary-foreground hover:bg-muted",
  danger:
    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive-hover"
};

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(BASE, SIZES[size], VARIANTS[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <Spinner className="h-4 w-4" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}

/* Convenience aliases kept for existing call sites. */
export function PrimaryButton(props: ButtonProps) {
  return <Button variant="primary" {...props} />;
}
export function SecondaryButton(props: ButtonProps) {
  return <Button variant="secondary" {...props} />;
}
export function OutlineButton(props: ButtonProps) {
  return <Button variant="outline" {...props} />;
}
export function GhostButton(props: ButtonProps) {
  return <Button variant="ghost" size={props.size ?? "sm"} {...props} />;
}
export function DangerButton(props: ButtonProps) {
  return <Button variant="danger" {...props} />;
}
export function DangerOutlineButton(props: ButtonProps) {
  return (
    <Button
      variant="outline"
      className={clsx(
        "border-destructive/40 text-destructive hover:bg-destructive/5 hover:border-destructive",
        props.className
      )}
      {...props}
    />
  );
}
