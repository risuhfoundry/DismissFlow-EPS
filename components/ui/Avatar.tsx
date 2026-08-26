import clsx from "clsx";

export function Avatar({
  name,
  className
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <div
      className={clsx(
        "flex items-center justify-center rounded-full bg-primary-soft text-primary font-semibold",
        className
      )}
      aria-label={name}
    >
      <span className="text-ios-subhead">{initials || "?"}</span>
    </div>
  );
}
