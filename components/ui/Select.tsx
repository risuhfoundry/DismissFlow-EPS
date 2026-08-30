import { forwardRef } from "react";
import { clsx } from "clsx";

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  invalid?: boolean;
  onChange?: (value: string) => void;
};

// Standardized native select. Matches the institutional control-room language of
// Input: monospace, hairline border, accent on focus. `onChange` receives the
// selected string value directly (not a ChangeEvent) so call sites stay terse.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, onChange, ...props }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange?.(e.target.value)}
      className={clsx(
        "h-12 px-3 bg-ink text-bone border rounded-none font-mono text-mono-sm outline-none transition-colors",
        invalid
          ? "border-danger focus:border-danger"
          : "border-line focus:border-accent",
        className
      )}
      {...props}
    />
  )
);

Select.displayName = "Select";
