import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * Responsive data table. Wrapped in overflow-x-auto with a min-width so wide
 * tables scroll horizontally on small screens instead of breaking layout.
 */
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
    <div className="w-full overflow-x-auto">
      <table
        className={clsx("w-full border-collapse text-left text-sm", className)}
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
      scope="col"
      className={clsx(
        "whitespace-nowrap border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
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
    <td className={clsx("whitespace-nowrap px-4 py-3 text-foreground", className)}>
      {children}
    </td>
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
        "border-b border-border transition-colors last:border-0 hover:bg-muted/60",
        className
      )}
    >
      {children}
    </tr>
  );
}
