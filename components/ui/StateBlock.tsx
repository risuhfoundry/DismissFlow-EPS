import clsx from "clsx";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { MonoLabel } from "./MonoLabel";
import { Spinner } from "./Spinner";

// Consistent loading / empty / error surfaces. Previously every page invented
// its own: some dropped a static Icon name="timer" (no animation) as a spinner,
// others a bare <p> for empty. These standardise the look and give screen
// readers a polite live region. Use inside a <Panel>.

function Shell({
  children,
  tone = "muted"
}: {
  children: ReactNode;
  tone?: "muted" | "danger";
}) {
  return (
    <div
      className={clsx(
        "min-h-[160px] flex flex-col items-center justify-center gap-3 p-10 text-center",
        tone === "danger" ? "text-danger" : "text-muted"
      )}
      role={tone === "danger" ? "alert" : "status"}
      aria-live={tone === "danger" ? "assertive" : "polite"}
    >
      {children}
    </div>
  );
}

export function LoadingState({ message = "Loading…" }: { message?: string }) {
  return (
    <Shell>
      <Spinner className="h-6 w-6" />
      <MonoLabel size="sm" tone="muted">
        {message}
      </MonoLabel>
    </Shell>
  );
}

export function EmptyState({
  message,
  icon = "history"
}: {
  message: string;
  icon?: "history" | "user" | "scan" | "settings" | "qr";
}) {
  return (
    <Shell>
      <Icon name={icon} className="h-7 w-7 text-muted/60" strokeWidth={1.2} />
      <MonoLabel size="sm" tone="muted">
        {message}
      </MonoLabel>
    </Shell>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Shell tone="danger">
      <Icon name="x" className="h-6 w-6" strokeWidth={2} />
      <MonoLabel size="sm" tone="danger">
        {message}
      </MonoLabel>
    </Shell>
  );
}
