import clsx from "clsx";

/** Horizontal or vertical hairline divider. */
export function Divider({
  className,
  orientation = "horizontal",
  label
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
  label?: string;
}) {
  if (orientation === "vertical") {
    return (
      <span
        className={clsx("inline-block w-px self-stretch bg-border", className)}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }
  if (label) {
    return (
      <div className={clsx("flex items-center gap-3", className)} role="separator">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
    );
  }
  return (
    <hr className={clsx("border-0 border-t border-border", className)} role="separator" />
  );
}
