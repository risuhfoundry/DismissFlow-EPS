"use client";

import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// Revora-style primary button: square corners, mono caps, accent fill with
// a soft glow on hover. Slight 2px lift on hover, scale on press.
export function PrimaryButton({
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      className={clsx(
        "group inline-flex items-center justify-center gap-3",
        "h-12 px-5 bg-accent text-white",
        "font-mono uppercase tracking-widest text-mono-sm font-semibold",
        "shadow-accent-glow",
        "transition-all duration-200",
        "hover:-translate-y-0.5 hover:bg-accent-deep",
        "active:scale-[0.98]",
        "disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
