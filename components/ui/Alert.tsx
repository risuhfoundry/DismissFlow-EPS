import clsx from "clsx";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type AlertTone = "success" | "warning" | "error" | "info" | "danger" | "warn";

const TONES: Record<
  AlertTone,
  { wrap: string; icon: IconName; iconColor: string }
> = {
  success: {
    wrap: "border-success/30 bg-success-soft text-success",
    icon: "check",
    iconColor: "text-success"
  },
  warning: {
    wrap: "border-warning/30 bg-warning-soft text-warning",
    icon: "warning",
    iconColor: "text-warning"
  },
  warn: {
    wrap: "border-warning/30 bg-warning-soft text-warning",
    icon: "warning",
    iconColor: "text-warning"
  },
  error: {
    wrap: "border-destructive/30 bg-destructive-soft text-destructive",
    icon: "alert",
    iconColor: "text-destructive"
  },
  danger: {
    wrap: "border-destructive/30 bg-destructive-soft text-destructive",
    icon: "alert",
    iconColor: "text-destructive"
  },
  info: {
    wrap: "border-info/30 bg-info-soft text-info",
    icon: "info",
    iconColor: "text-info"
  }
};

/**
 * Inline alert for success / warning / error / info. Announced via
 * role="alert" (assertive) or role="status" (polite for success/info).
 */
export function Alert({
  tone = "error",
  title,
  children,
  className,
  id
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  id?: string;
}) {
  const t = TONES[tone];
  const polite = tone === "success" || tone === "info";
  return (
    <div
      id={id}
      role={polite ? "status" : "alert"}
      aria-live={polite ? "polite" : "assertive"}
      className={clsx(
        "flex items-start gap-3 rounded-md border px-4 py-3 text-sm",
        t.wrap,
        className
      )}
    >
      <Icon
        name={t.icon}
        className={clsx("mt-0.5 h-4 w-4 shrink-0", t.iconColor)}
        strokeWidth={2}
      />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={clsx(title && "mt-0.5", "opacity-90")}>{children}</div>}
      </div>
    </div>
  );
}
