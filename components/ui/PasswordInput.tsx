"use client";

import { forwardRef, useState } from "react";
import clsx from "clsx";
import { Icon } from "./Icon";

export type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  invalid?: boolean;
  /** Validated/success state — green border. Lower priority than `invalid`. */
  valid?: boolean;
};

/**
 * Password field with an accessible show/hide toggle. The toggle is a real
 * button with an `aria-label` that flips with state so screen-reader users
 * always know what pressing it will do.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, invalid, valid, id, ...props }, ref) => {
    const [show, setShow] = useState(false);
    return (
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={show ? "text" : "password"}
          aria-invalid={invalid || undefined}
          className={clsx(
            "h-10 w-full rounded-md border bg-card px-3 pr-10 text-base text-foreground",
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
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon name={show ? "eye.off" : "eye"} className="h-4 w-4" />
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
