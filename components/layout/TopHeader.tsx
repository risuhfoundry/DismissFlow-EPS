"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { Dropdown } from "@/components/ui/Dropdown";
import { Wordmark } from "./Brand";
import type { Role } from "@/lib/auth/session";

export type ShellUser = {
  name: string;
  email?: string;
  role: Role;
};

// Role identity — a calm, always-visible signal of which portal you're in.
const ROLE_META: Record<Role, { label: string; icon: "users" | "school" | "scan" | "shield" }> = {
  parent: { label: "Parent", icon: "users" },
  teacher: { label: "Teacher", icon: "school" },
  gate: { label: "Gate", icon: "scan" },
  admin: { label: "Admin", icon: "shield" }
};

/**
 * Professional top header foundation: product identity, current school context,
 * a notifications affordance (no fake counts), and a user account menu.
 * `onMenuClick` opens the mobile navigation drawer.
 */
export function TopHeader({
  schoolName,
  user,
  onMenuClick,
  onSignOut,
  accountHref
}: {
  schoolName?: string;
  user?: ShellUser;
  onMenuClick?: () => void;
  onSignOut?: () => void;
  accountHref?: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onMenuClick && (
          <IconButton
            ariaLabel="Open navigation"
            variant="ghost"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Icon name="menu" className="h-5 w-5" />
          </IconButton>
        )}
        <Link href="/" className="flex items-center" aria-label="DismissFlow home">
          <Wordmark />
        </Link>
        {schoolName && (
          <>
            <span className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
            <span className="hidden items-center gap-1.5 truncate rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground sm:inline-flex">
              <Icon name="school" className="h-4 w-4 shrink-0" />
              <span className="truncate">{schoolName}</span>
            </span>
          </>
        )}
        {user && (
          <span className="hidden items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary md:inline-flex">
            <Icon name={ROLE_META[user.role].icon} className="h-3.5 w-3.5" />
            {ROLE_META[user.role].label}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {user && (
          <Dropdown
            label="Account menu"
            trigger={
              <span className="inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-2 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar name={user.name} size="sm" />
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-medium leading-tight text-foreground">
                    {user.name}
                  </span>
                  <span className="block text-xs leading-tight text-muted-foreground">
                    {ROLE_META[user.role].label}
                  </span>
                </span>
                <Icon name="chevron.down" className="hidden h-4 w-4 text-muted-foreground sm:block" />
              </span>
            }
            items={[
              ...(accountHref
                ? [
                    {
                      label: "Profile",
                      icon: <Icon name="user" className="h-4 w-4" />,
                      href: accountHref
                    }
                  ]
                : []),
              {
                label: "Sign out",
                icon: <Icon name="logout" className="h-4 w-4" />,
                danger: true,
                onSelect: onSignOut
              }
            ]}
          />
        )}
      </div>
    </header>
  );
}
