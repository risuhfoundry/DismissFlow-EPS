import type { ReactNode } from "react";
import { Wordmark } from "./Brand";

/**
 * PublicLayout — reusable foundation for public pages (landing, login, etc.).
 *
 * Deliberately minimal: a full-height frame, an optional slim brand bar, and a
 * quiet footer. No sidebar, no role chrome. Each future public page supplies
 * its own content. Compatible with the existing auth architecture — public
 * pages simply don't require a session.
 */
export function PublicLayout({
  children,
  showBrand = true,
  footer = true,
  centered
}: {
  children: ReactNode;
  showBrand?: boolean;
  footer?: boolean;
  /** Vertically centre a single narrow surface (e.g. a login card). */
  centered?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {showBrand && (
        <header className="border-b border-border bg-background/90 px-4 py-4 backdrop-blur sm:px-6">
          <Wordmark />
        </header>
      )}
      <div className={centered ? "flex flex-1 items-center justify-center px-4 py-10 sm:px-6" : "flex-1"}>
        {children}
      </div>
      {footer && (
        <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
          DismissFlow — safe, calm, and reliable school dismissal.
        </footer>
      )}
    </div>
  );
}
