"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

// Fixed top nav — Revora 66px bar, mono caps, hairline border, glass on scroll.
// Brand mark + role links + trailing status on the right. On <md the role
// links collapse into a hamburger menu so portal sub-routes stay reachable on
// phones (previously they were hidden entirely, stranding mobile users).
export function TopNav({
  brand = "DISMISSFLOW",
  links,
  trailing
}: {
  brand?: string;
  links: { label: string; href: string }[];
  trailing?: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={clsx(
        "fixed top-0 inset-x-0 z-40",
        "h-16 flex items-center justify-between px-5",
        "bg-ink/80 backdrop-blur-md",
        "border-b border-line"
      )}
    >
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3" aria-label="DismissFlow home">
          <span className="font-display text-xl tracking-wider text-bone uppercase">
            {brand}
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 ml-4">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "font-mono uppercase tracking-widest text-mono-sm transition-colors outline-none focus-visible:text-bone focus-visible:ring-2 focus-visible:ring-accent/70 rounded-sm",
                  active ? "text-bone" : "text-muted hover:text-bone"
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
            className="md:hidden h-10 w-10 inline-flex items-center justify-center hairline text-bone outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            <Icon name={open ? "close" : "menu"} className="h-5 w-5" strokeWidth={1.6} />
          </button>
        )}
      </div>

      {open && (
        <div className="md:hidden absolute top-16 inset-x-0 border-b border-line bg-ink/95 backdrop-blur-md">
          <nav className="flex flex-col p-3 gap-1">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "px-4 py-3 font-mono uppercase tracking-widest text-mono-sm transition-colors",
                    active
                      ? "text-bone bg-panel-alt"
                      : "text-muted hover:text-bone hover:bg-panel-alt"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
            {trailing && <div className="px-4 py-3 border-t border-line">{trailing}</div>}
          </nav>
        </div>
      )}
    </header>
  );
}
