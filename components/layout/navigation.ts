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
            { label: "Profile", href: "/teacher/profile", icon: "user" }
          ]
        }
      ];
    case "gate":
      return [
        {
          items: [
            { label: "Scan", href: "/gate", icon: "scan" },
            { label: "Profile", href: "/gate/profile", icon: "user" }
          ]
        }
      ];
    case "admin":
      return [
        {
          label: "Operations",
          items: [
            { label: "Overview", href: "/admin", icon: "grid" },
            { label: "People", href: "/admin/people", icon: "users" },
            { label: "Students", href: "/admin/students", icon: "clipboard" },
            { label: "Classes", href: "/admin/classes", icon: "school" },
            { label: "Dismissals", href: "/admin/dismissals", icon: "activity" },
            { label: "Activity", href: "/admin/activity", icon: "history" }
          ]
        },
        {
          label: "Account",
          items: [{ label: "Profile", href: "/admin/profile", icon: "user" }]
        }
      ];
    default:
      return [];
  }
}
