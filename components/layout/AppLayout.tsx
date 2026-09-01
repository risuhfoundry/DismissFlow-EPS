"use client";

import type { ReactNode } from "react";
import { AppShell } from "./AppShell";
import { getNavForRole } from "./navigation";
import type { Role } from "@/lib/auth/session";

/**
 * AppLayout — authenticated layout foundation.
 *
 * Thin wrapper that turns a role + user into the shared AppShell, pulling the
 * role's navigation from the central config. Future role phases (Parent /
 * Teacher / Gate / Admin) use this with their server-resolved session — no
 * shell duplication, and the existing auth/session contract is untouched.
 */
export function AppLayout({
  role,
  user,
  schoolName,
  children,
  onSignOut
}: {
  role: Role;
  user: { name: string; email?: string; role: Role };
  schoolName?: string;
  children: ReactNode;
  onSignOut?: () => void;
}) {
  return (
    <AppShell
      user={{ name: user.name, email: user.email, role }}
      schoolName={schoolName}
      navSections={getNavForRole(role)}
      onSignOut={onSignOut}
      accountHref={`/${role}/profile`}
    >
      {children}
    </AppShell>
  );
}
