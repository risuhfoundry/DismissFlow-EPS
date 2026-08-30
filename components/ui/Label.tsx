import clsx from "clsx";
import type { LabelHTMLAttributes, ReactNode } from "react";

/**
 * Accessible form label. Use with inputs/selects/checkboxes.
 * `hint` renders muted helper text; `required` shows a required marker.
 */
export function Label({
  children,
  className,
  hint,
  required,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement> & {
  hint?: ReactNode;
  required?: boolean;
}) {
  return (
    <label
      className={clsx(
        "block text-label text-foreground",
        className
      )}
      {...rest}
    >
      <span className="flex items-center gap-1">
        {children}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {hint && (
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          {hint}
        </span>
      )}
    </label>
  );
}
