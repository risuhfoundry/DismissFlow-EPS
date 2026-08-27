"use client";

import clsx from "clsx";
import { MonoLabel } from "./MonoLabel";
import type { ConnStatus } from "@/lib/realtime/subs";
import { statusLabel } from "@/lib/realtime/subs";

// Renders the REALTIME · LIVE / RECONNECTING / OFFLINE indicator shown in the
// portal nav. The pulse dot colour tracks the underlying status. Source of
// truth for the contract is the `statusLabel()` helper.
export function StatusIndicator({
  status,
  className
}: {
  status: ConnStatus;
  className?: string;
}) {
  const c = statusLabel(status);
  const dotClass =
    c.tone === "live"
      ? "bg-success shadow-[0_0_8px_#B7EF42]"
      : c.tone === "warn"
      ? "bg-warn shadow-[0_0_8px_#FEBC2E]"
      : "bg-danger shadow-[0_0_8px_#FF3B20]";
  return (
    <div
      className={clsx(
        "flex items-center gap-2 hairline bg-panel px-3 py-1.5",
        className
      )}
      aria-live="polite"
    >
      <span
        className={clsx("h-1.5 w-1.5 rounded-full", dotClass, "animate-pulse-dot")}
      />
      <MonoLabel size="xs" tone="bone">
        {c.label}
      </MonoLabel>
    </div>
  );
}
