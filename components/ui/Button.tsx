"use client";

import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";

// Unified button system for DismissFlow. Replaces the ad-hoc inline button
// classes that were duplicated across every page. One visual language:
//   primary      — blue fill, glow, the main call to action
//   secondary    — hairline ghost, neutral
//   danger       — red fill, destructive confirm
//   dangerOutline— red outline, destructive affordance
//   ghost        — text-only, for low-emphasis inline actions
// All variants share the focus-visible ring, disabled, and loading contract.

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "dangerOutline"
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "group inline-flex items-center justify-center gap-3 select-none " +
  "font-mono uppercase tracking-widest font-semibold " +
  "transition-all duration-200 " +
  "outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink " +
  "disabled:opacity-50 disabled:pointer-events-none";

const SIZES: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-mono-xs",
  md: "h-12 px-5 text-mono-sm",
  lg: "h-14 px-7 text-mono-sm"
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-accent-glow hover:-translate-y-0.5 hover:bg-accent-deep active:scale-[0.98]",
  secondary:
    "hairline bg-panel text-bone hover:bg-panel-alt hover:border-line",
  danger:
    "bg-danger text-white shadow-[0_0_30px_rgba(255,59,32,0.25)] hover:-translate-y-0.5 active:scale-[0.98]",
  dangerOutline:
    "hairline text-danger hover:bg-danger hover:text-white active:scale-[0.98]",
  ghost:
    "text-muted hover:text-bone hover:bg-panel-alt"
};

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(BASE, SIZES[size], VARIANTS[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner className="h-4 w-4" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

// Variant aliases — keep the call sites readable.
export function PrimaryButton(props: ButtonProps) {
  return <Button variant="primary" {...props} />;
}
export function SecondaryButton(props: ButtonProps) {
  return <Button variant="secondary" {...props} />;
}
export function DangerButton(props: ButtonProps) {
  return <Button variant="danger" {...props} />;
}
export function DangerOutlineButton(props: ButtonProps) {
  return <Button variant="dangerOutline" {...props} />;
}
export function GhostButton(props: ButtonProps) {
  return (
    <Button
      variant="ghost"
      size={props.size ?? "sm"}
      {...props}
      className={clsx("px-4", props.className)}
    />
  );
}
