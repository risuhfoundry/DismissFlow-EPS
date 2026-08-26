"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

type Tab = { label: string; icon: IconName; href: string };

// iOS-style bottom tab bar. Frosted, hairline top, 88pt height (incl.
// safe area), active tab tinted with primary.
export function TabBar({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 glass hairline-t pb-safe"
      aria-label="Primary"
    >
      <div className="h-[52px] flex items-stretch justify-around px-2">
        {tabs.map((t) => {
          const active =
            pathname === t.href ||
            (t.href !== "/" && pathname?.startsWith(t.href));
          return (
            <Link
              key={t.href}
              href={t.href}
              className={clsx(
                "flex-1 flex flex-col items-center justify-center gap-0.5",
                "tap-spring"
              )}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={clsx(
                  "flex h-7 w-12 items-center justify-center rounded-full",
                  active ? "bg-primary/10 text-primary" : "text-ink-subtle"
                )}
              >
                <Icon
                  name={t.icon}
                  className="h-[22px] w-[22px]"
                  strokeWidth={active ? 2 : 1.6}
                />
              </span>
              <span
                className={clsx(
                  "text-ios-caption-2",
                  active ? "text-primary font-semibold" : "text-ink-subtle"
                )}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
