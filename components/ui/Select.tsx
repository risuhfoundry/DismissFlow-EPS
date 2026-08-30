import { forwardRef } from "react";
import clsx from "clsx";
import { Icon } from "./Icon";

export type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "onChange"
> & {
  invalid?: boolean;
  /** Validated/success state — green border. Lower priority than `invalid`. */
  valid?: boolean;
  /** Called with the selected string value (matches prior API used by pages). */
  onChange?: (value: string) => void;
};

/**
 * Native select styled to match inputs. Keeps a value-based `onChange` so
 * existing call sites (`onChange={setX}`) keep working. The chevron is
 * decorative (aria-hidden).
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, valid, children, onChange, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange?.(e.target.value)}
        className={clsx(
          "h-10 w-full appearance-none rounded-md border bg-card pl-3 pr-9 text-base text-foreground",
          "transition-colors duration-150 outline-none cursor-pointer",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          invalid
            ? "border-destructive focus-visible:ring-destructive/40"
            : valid
              ? "border-success focus-visible:ring-success/40"
              : "border-input hover:border-border-strong",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="chevron.down"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
);

Select.displayName = "Select";
