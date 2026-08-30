import clsx from "clsx";
import type { ReactNode } from "react";
import { Spinner } from "./Spinner";
import { Skeleton } from "./Skeleton";

export type Column<T> = {
  key: string;
  header: ReactNode;
  render?: (row: T, index: number) => ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
  className?: string;
};

/**
 * DataTable — typed, declarative table for future role pages.
 * Handles header rendering, alignment, optional loading/empty states, and
 * horizontal scroll on small screens. Compose with `Column<T>` + rows.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty,
  className
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  empty?: ReactNode;
  className?: string;
}) {
  const minWidth = columns.length >= 4 ? "720px" : undefined;

  if (loading) {
    return (
      <div className="w-full overflow-x-auto" style={minWidth ? { minWidth } : undefined}>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3">
                  <Skeleton className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, r) => (
              <tr key={r} className="border-b border-border">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3">
                    <Skeleton className="h-4 w-full max-w-[160px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!rows.length) {
    return <>{empty ?? null}</>;
  }

  return (
    <div className="w-full overflow-x-auto" style={minWidth ? { minWidth } : undefined}>
      <table className={clsx("w-full border-collapse text-left text-sm", className)}>
        <thead>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th
                key={c.key}
                style={c.width ? { width: c.width } : undefined}
                className={clsx(
                  "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                  c.className
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              className="border-b border-border transition-colors last:border-0 hover:bg-muted/60"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={clsx(
                    "whitespace-nowrap px-4 py-3 text-foreground",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    c.className
                  )}
                >
                  {c.render ? c.render(row, i) : (row as Record<string, ReactNode>)[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Standalone loading overlay row used inside tables. */
export function TableLoading({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Spinner className="h-4 w-4" />
          Loading…
        </span>
      </td>
    </tr>
  );
}
