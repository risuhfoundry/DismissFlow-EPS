"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * Fixed top nav (light theme). Brand + role links + trailing status/actions.
 * On <md the links collapse into a menu so sub-routes stay reachable on phones.
 * Kept for existing role pages; the new authenticated shell uses TopHeader.
 */
export function TopNav({
  brand = "DismissFlow",
  links,
  trailing
}: {
  brand?: string;
  links: { label: string; href: string }[];
  trailing?: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 inset-x-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2" aria-label="DismissFlow home">
          <span className="text-title font-semibold tracking-tight text-foreground">
            {brand}
          </span>
        </Link>
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:block">{trailing}</div>
        {links.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            <Icon name={open ? "close" : "menu"} className="h-5 w-5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-16 inset-x-0 border-b border-border bg-background md:hidden">
          <nav className="flex flex-col p-2">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "rounded-md px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
            {trailing && <div className="px-2 py-2">{trailing}</div>}
          </nav>
        </div>
      )}
    </header>
  );
}
