import clsx from "clsx";
import type { ReactNode } from "react";
import { MonoLabel } from "./MonoLabel";

// A single definition row: mono caps label over a value. Replaces the repeated
// `<MonoLabel size="xs" tone="muted">X</MonoLabel><span>…</span>` pattern found
// in the parent profile, teacher detail, and admin class screens.
export function Field({
  label,
  children,
  className
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <MonoLabel size="xs" tone="muted">
        {label}
      </MonoLabel>
      <div className="text-bone">{children}</div>
    </div>
  );
}

// A two-column definition grid (label | value). Wrap <Field> rows in this.
export function DefinitionList({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl
      className={clsx(
        "p-7 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-y-5 gap-x-6",
        className
      )}
    >
      {children}
    </dl>
  );
}
