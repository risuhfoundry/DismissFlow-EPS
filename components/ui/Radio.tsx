import { forwardRef } from "react";
import clsx from "clsx";

export type RadioProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: React.ReactNode;
};

/** Accessible radio built on a real <input type="radio">. */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, id, ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        id={id}
        type="radio"
        className={clsx("peer sr-only", className)}
        {...props}
      />
    );
    const dot = (
      <span
        className={clsx(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong bg-card transition-colors",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
          "peer-checked:border-primary",
          "peer-disabled:opacity-50 peer-disabled:pointer-events-none"
        )}
        aria-hidden="true"
      >
        <span className="h-2.5 w-2.5 scale-0 rounded-full bg-primary transition-transform peer-checked:scale-100" />
      </span>
    );
    if (!label) {
      return (
        <span className="inline-flex">
          {input}
          {dot}
        </span>
      );
    }
    return (
      <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
        {input}
        {dot}
        <span>{label}</span>
      </label>
    );
  }
);

Radio.displayName = "Radio";
