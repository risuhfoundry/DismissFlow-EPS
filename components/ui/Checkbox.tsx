import { forwardRef } from "react";
import clsx from "clsx";
import { Icon } from "./Icon";

export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: React.ReactNode;
};

/**
 * Accessible checkbox built on a real <input type="checkbox"> (keyboard +
 * screen-reader native). The visual box is drawn with peer styling.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={clsx(
          "peer sr-only",
          className
        )}
        {...props}
      />
    );
    const box = (
      <span
        className={clsx(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border-strong bg-card text-primary-foreground transition-colors",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
          "peer-checked:bg-primary peer-checked:border-primary",
          "peer-disabled:opacity-50 peer-disabled:pointer-events-none"
        )}
        aria-hidden="true"
      >
        <Icon
          name="check"
          className="h-3.5 w-3.5 scale-0 text-primary-foreground transition-transform peer-checked:scale-100"
          strokeWidth={2.5}
        />
      </span>
    );
    if (!label) {
      return (
        <span className="inline-flex">
          {input}
          {box}
        </span>
      );
    }
    return (
      <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
        {input}
        {box}
        <span>{label}</span>
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
