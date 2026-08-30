import type { IconName } from "@/components/ui/Icon";
import type { Role } from "@/lib/auth/session";

/**
 * Navigation configuration contract for the authenticated shell.
 *
 * The shell is config-driven so each future role phase (Parent / Teacher /
 * Gate / Admin) can plug in its own navigation WITHOUT duplicating the shell.
 * These types are the shared contract; the actual per-role items live in
 * `RoleNav.tsx` (foundation placeholders, replaced per phase).
 */
export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  /** Optional count badge (e.g. pending requests). */
  badge?: number;
  /** Mark as a trailing/secondary action item. */
  secondary?: boolean;
};

export type NavSection = {
  /** Optional group heading. Omit for an ungrouped list. */
  label?: string;
  items: NavItem[];
};

export type NavConfig = NavSection[];

/**
 * Foundation placeholder navigation per role. These are SCAFFOLD labels only —
 * not production data, and intentionally generic. Each role phase will replace
 * its section with the real, backend-driven navigation.
 */
export function getNavForRole(role: Role): NavConfig {
  switch (role) {
    case "parent":
      return [
        {
          items: [
            { label: "Home", href: "/parent", icon: "home" },
            { label: "History", href: "/parent/history", icon: "history" },
            { label: "Profile", href: "/parent/profile", icon: "user" }
          ]
        }
      ];
    case "teacher":
      return [
        {
          items: [
            { label: "Queue", href: "/teacher", icon: "clipboard" },
            { label: "Classes", href: "/teacher/classes", icon: "school" }
          ]
        }
      ];
    case "gate":
      return [
        {
          items: [{ label: "Release", href: "/gate", icon: "scan" }]
        }
      ];
    case "admin":
      return [
        {
          label: "Operations",
          items: [
            { label: "Dashboard", href: "/admin", icon: "grid" },
            { label: "Classes", href: "/admin/classes", icon: "school" },
            { label: "Roster", href: "/admin/roster", icon: "users" },
            { label: "Users", href: "/admin/users", icon: "key" }
          ]
        },
        {
          label: "System",
          items: [
            { label: "Monitor", href: "/admin/monitor", icon: "activity" as IconName },
            { label: "Logs", href: "/admin/logs", icon: "history" }
          ]
        }
      ];
    default:
      return [];
  }
}
