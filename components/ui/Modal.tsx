"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { IconButton } from "./IconButton";
import { Icon } from "./Icon";

/**
 * Modal — accessible dialog with focus management.
 * - role="dialog" + aria-modal
 * - Escape closes; backdrop click closes
 * - focus moves into the dialog on open and is restored on close
 * - traps Tab within the dialog
 * - locks body scroll while open
 * Respects prefers-reduced-motion (handled globally in globals.css).
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md"
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && ref.current) {
        const focusables = ref.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>("[data-autofocus]");
      if (el) el.focus();
      else ref.current?.focus();
    }, 10);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      window.clearTimeout(t);
      prevFocus.current?.focus?.();
    };
  }, [open, onKey]);

  if (!open || typeof document === "undefined") return null;

  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className={clsx(
          "relative z-10 w-full rounded-t-2xl bg-card shadow-popover outline-none animate-slide-up sm:rounded-2xl",
          "max-h-[92vh] overflow-y-auto",
          sizes[size]
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div className="min-w-0">
              {title && (
                <h2 className="text-title font-semibold text-foreground">{title}</h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <IconButton
              ariaLabel="Close dialog"
              variant="ghost"
              onClick={onClose}
              className="-mr-2 -mt-1"
            >
              <Icon name="close" className="h-5 w-5" />
            </IconButton>
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/** Dialog is an alias for Modal (same accessible contract). */
export const Dialog = Modal;
