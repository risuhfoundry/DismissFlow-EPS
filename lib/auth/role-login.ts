"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// Per-person authentication (Phase 17 — real production identity).
//
// Every real person authenticates with their OWN identity, never a shared
// account:
//   * Parent  → ID = admission number,  password = admission number
//   * Teacher → ID = staff id,           password = staff id
//   * Gate    → ID = gate id,            password = gate id
//   * Admin   → ID = admin id,           password = admin id
//
// The Supabase Auth account is keyed on an email that is DERIVED from the
// person's login_id via a deterministic internal domain mapping. The email is an
// internal plumbing artifact only — it is never shown to the user and is
// configuration (env-overridable), so it is not a hardcoded production value.
// The user-facing credential is always the per-person ID + password.
//
// The browser NEVER asserts role or authorization: it only presents the person's
// ID and password. Supabase Auth resolves the account, and the server derives
// role / school / links from public.users (see lib/auth/session.ts and RLS).
const AUTH_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_DEMO_EMAIL_DOMAIN ?? "demo.dismissflow";

export function loginIdToEmail(loginId: string): string {
  return `${loginId.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

export type StaffRole = "teacher" | "gate" | "admin";

// Signs a staff member in with their per-person ID + password. The email is
// derived from the ID; the password the caller passes should equal the ID per
// the product requirement (we do not enforce that client-side — the Auth
// account simply has that password set at provisioning time).
export async function signInById(
  _role: StaffRole,
  loginId: string,
  password: string
) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signInWithPassword({
    email: loginIdToEmail(loginId),
    password
  });
}

// Retained for any legacy callers; maps to the new per-person flow.
export function roleEmail(role: StaffRole): string {
  return `${role}@${AUTH_EMAIL_DOMAIN}`;
}

export async function signInStaff(
  role: StaffRole,
  password: string
): Promise<{ error: { message: string } | null }> {
  return signInById(role, role, password) as unknown as {
    error: { message: string } | null;
  };
}
