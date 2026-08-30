"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import type { NavConfig } from "./navigation";

/**
 * Config-driven sidebar navigation. Active route is highlighted; sections are
 * grouped; items may carry a badge. Fully keyboard accessible (real links).
 */
export function Sidebar({
  sections,
  onNavigate,
  footer
}: {
  sections: NavConfig;
  onNavigate?: () => void;
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5" aria-label="Primary">
      {sections.map((section, si) => (
        <div key={si} className="flex flex-col gap-1">
          {section.label && (
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.label}
            </p>
          )}
          {section.items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={clsx(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary-soft text-primary before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-full before:bg-primary before:content-['']"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
      {footer && <div className="mt-auto pt-4">{footer}</div>}
    </nav>
  );
}
