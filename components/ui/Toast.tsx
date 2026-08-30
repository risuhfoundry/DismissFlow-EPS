"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Icon, type IconName } from "./Icon";

type ToastTone = "success" | "error" | "warning" | "info";
type Toast = { id: number; tone: ToastTone; title: string; description?: string };

type ToastContextValue = {
  toast: (t: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICON: Record<ToastTone, IconName> = {
  success: "check",
  error: "alert",
  warning: "warning",
  info: "info"
};

const TONE: Record<ToastTone, string> = {
  success: "text-success",
  error: "text-destructive",
  warning: "text-warning",
  info: "text-info"
};

/** Wrap the app (or a layout) to enable <ToastProvider> + useToast(). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Gate the portal on mount so server + initial client render match
  // (avoids a hydration mismatch from `typeof document` checks at render time).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { ...t, id }]);
      window.setTimeout(() => remove(id), 5000);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
            aria-live="polite"
            aria-atomic="false"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                role="status"
                className="flex items-start gap-3 rounded-lg border border-border bg-popover p-3.5 shadow-popover animate-slide-up"
              >
                <Icon name={ICON[t.tone]} className={clsx("mt-0.5 h-4 w-4 shrink-0", TONE[t.tone])} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{t.title}</p>
                  {t.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => remove(t.id)}
                  className="shrink-0 rounded p-1 text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

/** Hook to push toasts from any client component. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
