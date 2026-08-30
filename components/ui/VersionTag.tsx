import { LiveDot } from "./LiveBadge";
import { MonoLabel } from "./MonoLabel";

/** Brand chip shown in the top nav. Version string centralised here. */
export function VersionTag({ version = "V0.1" }: { version?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
      <LiveDot tone="live" />
      <MonoLabel size="xs" tone="muted">
        DISMISS / {version}
      </MonoLabel>
    </div>
  );
}
