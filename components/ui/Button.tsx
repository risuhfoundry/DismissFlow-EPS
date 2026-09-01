"use client";

import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";
import {
  BUTTON_BASE,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  type ButtonVariant,
  type ButtonSize
} from "./buttonStyles";

/**
 * DismissFlow button system.
 *
 * Variants: primary | secondary | outline | ghost | danger
 * Sizes:    sm | md | lg
 * States:   default / hover / active / focus-visible / disabled / loading.
 *
 * Loading buttons set `aria-busy` and disable pointer events so a second
 * submit cannot fire (prevents duplicate submission).
 *
 * Style vocabulary is shared with <LinkButton> via components/ui/buttonStyles.ts.
 */
export type { ButtonVariant, ButtonSize };

const BASE = BUTTON_BASE;
const SIZES = BUTTON_SIZES;
const VARIANTS = BUTTON_VARIANTS;

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
