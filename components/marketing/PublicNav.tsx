"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Wordmark } from "@/components/layout/Brand";
import { LinkButton } from "./LinkButton";

const LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "For Parents", href: "#for-parents" },
  { label: "For Schools", href: "#for-schools" },
  { label: "Security", href: "#security" }
];

/**
 * Public site navigation. Premium, calm, and fully responsive. Desktop shows
 * inline links + a single Sign in CTA; mobile collapses to a menu drawer.
 */
export function PublicNav() {
  const [open, setOpen] = useState(false);

  // Close the mobile drawer on resize to desktop so it never gets stuck open.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-content items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="DismissFlow home">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LinkButton href="/login" size="sm" className="hidden md:inline-flex">
            Sign in
          </LinkButton>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            <Icon name={open ? "close" : "menu"} className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-border bg-background md:hidden">
          <nav className="flex flex-col p-2" aria-label="Mobile">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-4 py-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {l.label}
              </Link>
            ))}
            <LinkButton
              href="/login"
              size="md"
              className="mt-2 w-full"
              onClick={() => setOpen(false)}
            >
              Sign in
            </LinkButton>
          </nav>
        </div>
      )}
    </header>
  );
}
