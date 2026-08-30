import { forwardRef } from "react";
import clsx from "clsx";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  /** Validated/success state — green border. Lower priority than `invalid`. */
  valid?: boolean;
};

/**
 * Text input. Always pair with a <Label> (see Label.tsx) — never rely on
 * placeholder text alone. `aria-invalid` is forwarded so error text can be
 * wired with `aria-describedby`.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, valid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={clsx(
        "h-10 w-full rounded-md border bg-card px-3 text-base text-foreground",
        "placeholder:text-muted-foreground/70 transition-colors duration-150",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        invalid
          ? "border-destructive focus-visible:ring-destructive/40"
          : valid
            ? "border-success focus-visible:ring-success/40"
            : "border-input hover:border-border-strong",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
