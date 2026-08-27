"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// Demo-only parent authentication (PRD §12).
//
// The parent Auth account's email is DERIVED from the admission number the parent
// already knows — it is never hardcoded student data. The admission number the
// parent types at login time becomes the email local-part via a deterministic
// demo-domain mapping. No student name, UUID, or credential is stored here.
//
// The domain is configuration (env-overridable) so it is not a hardcoded
// production value. The PRD's demo shortcut (admission number used as the
// password) is applied by the provisioning script when it creates the account;
// this module only maps the identifier.
const DEMO_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_DEMO_EMAIL_DOMAIN ?? "demo.dismissflow";

export function admissionToEmail(admissionNo: string): string {
  return `${admissionNo.trim()}@${DEMO_EMAIL_DOMAIN}`;
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
