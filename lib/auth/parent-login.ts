"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { loginIdToEmail } from "@/lib/auth/role-login";

// Per-person parent authentication (Phase 17).
//
// The parent Auth account's email is DERIVED from the admission number the parent
// already knows — it is never hardcoded student data. The admission number the
// parent types at login time becomes the email local-part via the same unified
// login_id → email mapping every role uses (see lib/auth/role-login.ts). No
// student name, UUID, or credential is stored here.
//
// The PRD's product requirement (admission number used as the password) is
// applied by the provisioning script when it creates the account; this module
// only maps the identifier.
export function admissionToEmail(admissionNo: string): string {
  return loginIdToEmail(admissionNo);
}

// Signs a parent in through REAL Supabase Auth. Returns the auth result so the
// caller can branch on `error`. Identity is resolved server-side via
// public.users → linked_student_id → students (see lib/auth/session.ts).
export async function signInParent(admissionNo: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signInWithPassword({
    email: admissionToEmail(admissionNo),
    password
  });
}
