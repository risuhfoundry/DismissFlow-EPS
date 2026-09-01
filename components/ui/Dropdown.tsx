"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import Link from "next/link";
import clsx from "clsx";
import { Icon } from "./Icon";

export type DropdownItem = {
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  /** Render the item as a link (e.g. the account/profile entry). */
  href?: string;
  danger?: boolean;
  disabled?: boolean;
};

/**
 * Dropdown menu triggered by a button. Closes on outside click, Escape, or
 * item select. Keyboard: Escape closes; focus returns to the trigger.
 */
export function Dropdown({
  trigger,
  items,
  align = "end",
  label = "Open menu"
}: {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={clsx(
            "absolute z-40 mt-2 min-w-[12rem] rounded-lg border border-border bg-popover p-1 shadow-popover animate-scale-in",
            align === "end" ? "right-0" : "left-0"
          )}
        >
          {items.map((it, i) =>
            it.href ? (
              <Link
                key={i}
                role="menuitem"
                href={it.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors",
                  "focus-visible:bg-muted text-foreground hover:bg-muted"
                )}
              >
                {it.icon && <span className="shrink-0 text-muted-foreground">{it.icon}</span>}
                {it.label}
              </Link>
            ) : (
              <button
                key={i}
                role="menuitem"
                type="button"
                disabled={it.disabled}
                onClick={() => {
                  it.onSelect?.();
                  setOpen(false);
                }}
                className={clsx(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors",
                  "focus-visible:bg-muted disabled:opacity-50 disabled:pointer-events-none",
                  it.danger
                    ? "text-destructive hover:bg-destructive-soft"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {it.icon && <span className="shrink-0 text-muted-foreground">{it.icon}</span>}
                {it.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

export { Icon };
