import clsx from "clsx";
import { MonoLabel } from "./MonoLabel";

// A single key figure. Used in the admin overview population/dismissal grids and
// the monitor status tally. Fixed, contained sizing (text-4xl) so numbers never
// overflow the small grid cells — previously the overview used display-md which
// blew past the cell width.
export function Stat({
  label,
  value,
  accent = false,
  className
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx("bg-panel p-6", className)}>
      <MonoLabel size="sm" tone="muted">
        {label}
      </MonoLabel>
      <p
        className={clsx(
          "font-display text-4xl uppercase mt-2 leading-none tabular-nums",
          accent ? "text-accent" : "text-bone"
        )}
      >
        {value}
      </p>
    </div>
  );
}
