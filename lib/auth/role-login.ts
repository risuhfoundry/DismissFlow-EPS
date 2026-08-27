"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// Real Supabase Auth sign-in for the demo teacher / gate / admin accounts
// provisioned by scripts/provision-demo-identities.mjs.
//
// The provisioning script creates these accounts with the convention
//   <role>@<NEXT_PUBLIC_DEMO_EMAIL_DOMAIN>
// and prints (or reads from env) the password. The email domain is
// configuration (env-overridable) so it is not a hardcoded production value.
const DEMO_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_DEMO_EMAIL_DOMAIN ?? "demo.dismissflow";

export function roleEmail(role: "teacher" | "gate" | "admin"): string {
  return `${role}@${DEMO_EMAIL_DOMAIN}`;
}

export type StaffRole = "teacher" | "gate" | "admin";

export async function signInStaff(role: StaffRole, password: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signInWithPassword({
    email: roleEmail(role),
    password
  });
}
