"use client";

import Link from "next/link";
import { Wordmark } from "@/components/layout/Brand";
import { AuthShell, type AuthShellConfig } from "@/components/auth/AuthShell";
import { signInById, type StaffRole } from "@/lib/auth/role-login";

// Single, coherent sign-in surface for the three staff roles. The route segment
// IS the role; the page renders the shared AuthShell with role-specific copy and
// authenticates through the existing per-person staff login (signInById). Parents
// use the dedicated /login flow (admission number) — app/login/page.tsx.

type StaffMeta = Omit<AuthShellConfig, "role" | "signIn" | "portal"> & {
  portal: string;
};

const STAFF_META: Record<StaffRole, StaffMeta> = {
  teacher: {
    roleLabel: "Teacher",
    roleIcon: "school",
    heading: "Sign in to review and manage dismissal requests.",
    description: "Use your staff credentials to access your pickup queue.",
    identifierLabel: "Staff ID",
    identifierPlaceholder: "Your staff ID",
    identifierAutocomplete: "username",
    identifierHint: "Your school-issued staff ID.",
    portal: "/teacher"
  },
  gate: {
    roleLabel: "Gate",
    roleIcon: "scan",
    heading: "Sign in to verify student dismissals.",
    description: "Use your assigned Gate ID to securely access the scanner.",
    identifierLabel: "Gate ID",
    identifierPlaceholder: "Your gate ID",
    identifierAutocomplete: "username",
    identifierHint: "Your assigned gate ID.",
    portal: "/gate"
  },
  admin: {
    roleLabel: "Admin",
    roleIcon: "shield",
    heading: "Sign in to manage your school's dismissal operations.",
    description: "Use your administrator credentials to access school operations.",
    identifierLabel: "Admin ID",
    identifierPlaceholder: "Your admin ID",
    identifierAutocomplete: "username",
    identifierHint: "Your administrator ID.",
    portal: "/admin"
  }
};

function isStaffRole(value: string): value is StaffRole {
  return value === "teacher" || value === "gate" || value === "admin";
}

export default function StaffLoginPage({ params }: { params: { role: string } }) {
  const role: StaffRole | null = isStaffRole(params.role) ? params.role : null;

  if (!role) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md text-center">
          <Link href="/" className="mb-8 flex items-center justify-center" aria-label="DismissFlow home">
            <Wordmark />
          </Link>
          <h1 className="text-h2 font-semibold text-foreground">Not a sign-in page</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a role from the{" "}
            <Link href="/" className="font-medium text-primary underline underline-offset-4">
              home page
            </Link>
            .
          </p>
        </div>
      </main>
    );
  }

  const meta = STAFF_META[role];

  return (
    <AuthShell
      role={role}
      roleLabel={meta.roleLabel}
      roleIcon={meta.roleIcon}
      heading={meta.heading}
      description={meta.description}
      identifierLabel={meta.identifierLabel}
      identifierPlaceholder={meta.identifierPlaceholder}
      identifierAutocomplete={meta.identifierAutocomplete}
      identifierHint={meta.identifierHint}
      portal={meta.portal}
      signIn={(identifier, password) => signInById(role, identifier, password)}
    />
  );
}
