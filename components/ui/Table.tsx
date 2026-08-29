import clsx from "clsx";
import type { ReactNode } from "react";

// Responsive data table. Wraps the <table> in an overflow-x-auto container with
// a min-width so wide admin tables scroll horizontally on small screens instead
// of breaking the layout or being clipped by the global overflow-x:hidden.
export function Table({
  children,
  className,
  minWidth = "720px"
}: {
  children: ReactNode;
  className?: string;
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table
        className={clsx("w-full text-left border-collapse", className)}
        style={{ minWidth }}
      >
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={clsx(
        "px-5 py-3 font-mono uppercase tracking-widest text-mono-xs text-muted whitespace-nowrap border-b border-line",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={clsx("px-5 py-4 whitespace-nowrap", className)}>{children}</td>
  );
}

export function Tr({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={clsx(
        "border-b border-line/60 hover:bg-panel-alt transition-colors",
        className
      )}
    >
      {children}
    </tr>
  );
}
