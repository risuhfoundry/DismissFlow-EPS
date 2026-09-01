"use client";

import { useState, type ReactNode } from "react";
import { TopHeader, type ShellUser } from "./TopHeader";
import { Sidebar } from "./Sidebar";
import { Drawer } from "@/components/ui/Drawer";
import { ToastProvider } from "@/components/ui/Toast";
import { Wordmark } from "./Brand";
import type { NavConfig } from "./navigation";

/**
 * Authenticated application shell foundation.
 *
 * Desktop: sticky top header + left sidebar + main content.
 * Mobile:  top header + slide-in navigation drawer.
 *
 * The shell is fully config-driven — role-specific navigation is supplied via
 * `navSections` so Parent / Teacher / Gate / Admin phases reuse this exact
 * shell without copying it. No role logic lives here.
 */
export function AppShell({
  user,
  schoolName,
  navSections,
  children,
  onSignOut,
  accountHref,
  sidebarFooter
}: {
  user?: ShellUser;
  schoolName?: string;
  navSections: NavConfig;
  children: ReactNode;
  onSignOut?: () => void;
  accountHref?: string;
  sidebarFooter?: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <TopHeader
          schoolName={schoolName}
          user={user}
          onMenuClick={() => setDrawerOpen(true)}
          onSignOut={onSignOut}
          accountHref={accountHref}
        />

        <div className="lg:grid lg:grid-cols-[16rem_1fr]">
          <aside className="hidden border-r border-border bg-card/40 lg:block">
            <div className="sticky top-16 h-[calc(100vh-4rem)]">
              <Sidebar sections={navSections} footer={sidebarFooter} />
            </div>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>

        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          side="left"
          title={<Wordmark />}
          width="max-w-xs"
        >
          <Sidebar sections={navSections} onNavigate={() => setDrawerOpen(false)} />
        </Drawer>
      </div>
    </ToastProvider>
  );
}
