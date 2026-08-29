import { forwardRef } from "react";
import { clsx } from "clsx";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

// Standardized text input. Matches the institutional control-room language:
// monospace metadata, hairline border, accent on focus, danger when invalid.
// `aria-invalid` is forwarded so error messages can be wired with
// `aria-describedby` (see Alert / form patterns).
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={clsx(
        "h-12 px-4 bg-ink text-bone border rounded-none font-mono text-mono-sm outline-none transition-colors",
        invalid
          ? "border-danger focus:border-danger"
          : "border-line focus:border-accent",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
