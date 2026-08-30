import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

/**
 * Card — the primary elevated surface. Compose with CardHeader / CardTitle /
 * CardDescription / CardContent / CardFooter, or use bare with padding.
 */
export function Card({
  className,
  interactive,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-border bg-card text-card-foreground shadow-card",
        interactive &&
          "transition-shadow duration-150 hover:shadow-popover focus-within:shadow-popover",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  title,
  description,
  action,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex items-start justify-between gap-4 border-b border-border px-5 py-4",
        className
      )}
      {...props}
    >
      <div className="min-w-0">
        {title && (
          <h3 className="text-title font-semibold text-foreground">{title}</h3>
        )}
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={clsx("text-title font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={clsx("text-sm text-muted-foreground", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("px-5 py-4", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "flex items-center gap-3 border-t border-border px-5 py-4",
        className
      )}
      {...props}
    />
  );
}
