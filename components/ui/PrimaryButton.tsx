"use client";

import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// iOS-style primary button — full-width pill, indigo fill, white label,
// soft ambient shadow, spring-scale tap. Single source for the brand CTA.
export function PrimaryButton({
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      className={clsx(
        "w-full inline-flex items-center justify-center gap-2 rounded-full",
        "bg-primary text-white font-semibold text-ios-headline",
        "py-3.5 px-5 shadow-ambient",
        "tap-spring focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
