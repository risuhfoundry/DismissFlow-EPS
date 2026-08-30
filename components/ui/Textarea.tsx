import { forwardRef } from "react";
import clsx from "clsx";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={clsx(
        "w-full rounded-md border bg-card px-3 py-2 text-base text-foreground",
        "placeholder:text-muted-foreground/70 transition-colors duration-150 resize-y",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        invalid
          ? "border-destructive focus-visible:ring-destructive/40"
          : "border-input hover:border-border-strong",
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = "Textarea";
