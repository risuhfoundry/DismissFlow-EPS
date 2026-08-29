import { LiveDot } from "./LiveBadge";
import { MonoLabel } from "./MonoLabel";

// The "DISMISS / V0.1" brand chip shown in the top nav across every surface.
// Centralised so the version string lives in one place.
export function VersionTag({ version = "V0.1" }: { version?: string }) {
  return (
    <div className="flex items-center gap-2 hairline bg-panel px-3 py-1.5">
      <LiveDot tone="live" />
      <MonoLabel size="xs" tone="bone">
        DISMISS / {version}
      </MonoLabel>
    </div>
  );
}
