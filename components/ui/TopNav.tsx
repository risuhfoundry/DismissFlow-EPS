"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Fixed top nav — Revora 66px bar, mono caps, hairline border, glass on
// scroll. Brand mark + role links + status pill on the right.
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
  return (
    <header
      className={clsx(
        "fixed top-0 inset-x-0 z-40",
        "h-16 flex items-center justify-between px-5",
        "bg-ink/80 backdrop-blur-md",
        "border-b border-line"
      )}
    >
      <Link href="/" className="flex items-center gap-3">
        <span className="font-display text-xl tracking-wider text-bone uppercase">
          {brand}
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-7">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "font-mono uppercase tracking-widest text-mono-sm transition-colors",
                active ? "text-bone" : "text-muted hover:text-bone"
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">{trailing}</div>
    </header>
  );
}
