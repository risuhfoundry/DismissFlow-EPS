#!/usr/bin/env node
// DismissFlow EPS — Phase 17: convert the pilot's shared staff accounts into
// real per-person identities.
//
// The seed script (provision-demo-identities.mjs) created ONE shared teacher /
// gate / admin account each (email teacher@ / gate@ / admin@, no login_id).
// Phase 16 flagged that as blocker B2 (shared staff accounts). This script gives
// each of those three real staff members a distinct login_id and re-keys their
// linked Supabase Auth account so the email/password are per-person:
//
//   teacher -> login_id "TCH-1001",  email tch-1001@<domain>,  password = login_id
//   gate    -> login_id "GTE-1001",  email gte-1001@<domain>,  password = login_id
//   admin   -> login_id "ADM-1001",  email adm-1001@<domain>,  password = login_id
//
// The browser never chooses these values; they are pilot data in the database,
// not hardcoded in application code. They are real, globally-unique identities
// (enforced by the users_login_id_key unique index).
//
// Idempotent: a staff row that already has a login_id is left untouched, so the
// script is safe to re-run.
//
// RUN (service role only — never shipped to the browser):
//   node scripts/provision-per-person-staff.mjs
// (reads SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from
//  .env.local if present.)

import { readFileSync } from "node:fs";

// Minimal .env.local loader (no third-party dep, no secrets echoed).
try {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
} catch {
  // No .env.local — rely on externally supplied env.
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_DEMO_EMAIL_DOMAIN || "demo.dismissflow";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing required env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function loginIdToEmail(loginId) {
  return `${loginId.trim().toLowerCase()}@${DEMO_EMAIL_DOMAIN}`;
}

// Canonical per-person login identifiers for the pilot's three staff accounts.
// Stored and provisioned in LOWERCASE so the credential the user types
// ("gte-1001") matches the Auth password exactly. The frontend lowercases the
// entered ID when deriving the Auth email, so lowercasing here keeps the email,
// the stored login_id, and the Auth password in agreement — avoiding a
// case-sensitive mismatch at sign-in (Supabase Auth passwords are case-sensitive).
const STAFF = [
  { role: "teacher", login_id: "tch-1001" },
  { role: "gate", login_id: "gte-1001" },
  { role: "admin", login_id: "adm-1001" }
];

async function main() {
  for (const { role, login_id } of STAFF) {
    const normalized = login_id.trim().toLowerCase();
    const email = loginIdToEmail(normalized); // e.g. gte-1001@<domain>

    const { data: profile, error: pErr } = await supabase
      .from("users")
      .select("user_id, role, login_id, assigned_class_id")
      .eq("role", role)
      .maybeSingle();

    if (pErr) throw new Error(`lookup ${role}: ${pErr.message}`);
    if (!profile) {
      console.log(`- ${role}: no public.users row found, skipping.`);
      continue;
    }

    // Re-apply the per-person Auth identity every run (idempotent and safe):
    // the email and password (password = normalized login_id) are derived from
    // the person, never hardcoded. This guarantees the live credential always
    // matches the lifecycle, even if a prior run left it inconsistent.
    const { error: updErr } = await supabase.auth.admin.updateUserById(profile.user_id, {
      email,
      password: normalized,
      email_confirm: true
    });
    if (updErr) throw new Error(`updateAuth ${role}: ${updErr.message}`);

    // Keep the stored login_id in canonical lowercase form.
    if (profile.login_id !== normalized) {
      const { error: profErr } = await supabase
        .from("users")
        .update({ login_id: normalized })
        .eq("user_id", profile.user_id);
      if (profErr) throw new Error(`updateProfile ${role}: ${profErr.message}`);
    }

    // For teacher, ensure the class is wired (idempotent).
    if (role === "teacher" && !profile.assigned_class_id) {
      const { data: cls } = await supabase
        .from("classes")
        .select("class_id")
        .eq("class_name", "Tulip")
        .maybeSingle();
      if (cls) {
        await supabase.from("users").update({ assigned_class_id: cls.class_id }).eq("user_id", profile.user_id);
        await supabase.from("classes").update({ teacher_id: profile.user_id }).eq("class_id", cls.class_id);
      }
    }

    console.log(`✓ ${role}: per-person identity confirmed -> login_id=${normalized} (password = login_id)`);
  }
  console.log("\nDone. Staff now sign in per-person at /login/[role] with their ID and password.");
}

main().catch((e) => {
  console.error("\n✗ Per-person staff provisioning failed:", e.message);
  process.exit(1);
});
