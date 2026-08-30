import clsx from "clsx";
import type { ReactNode } from "react";

/** A labelled definition row: label above a value. */
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
    <div className={clsx("flex flex-col gap-1", className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

/** Two-column definition list (label | value). Wrap <Field> rows in this. */
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
        "grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-[200px_1fr]",
        className
      )}
    >
      {children}
    </dl>
  );
}
