"use client";

import { useId, useState, type ReactNode } from "react";
import clsx from "clsx";

/**
 * Tooltip — shows on hover and focus, with aria-describedby wiring.
 * Wraps an interactive trigger (button, link, icon). The trigger receives
 * focus/keyboard support naturally; the tip is decorative (aria-hidden).
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  const [show, setShow] = useState(false);
  const id = useId();

  const pos = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2"
  }[side];

  return (
    <span
      className={clsx("relative inline-flex", className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      <span aria-describedby={show ? id : undefined}>{children}</span>
      {show && (
        <span
          role="tooltip"
          id={id}
          className={clsx(
            "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-popover animate-fade-in",
            pos
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
