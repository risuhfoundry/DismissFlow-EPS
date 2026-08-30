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

// Per-staff login_id assignments for the pilot's three shared accounts.
const STAFF = [
  { role: "teacher", login_id: "TCH-1001" },
  { role: "gate", login_id: "GTE-1001" },
  { role: "admin", login_id: "ADM-1001" }
];

async function main() {
  for (const { role, login_id } of STAFF) {
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
    if (profile.login_id) {
      console.log(`- ${role}: already per-person (login_id=${profile.login_id}), skipping.`);
      continue;
    }

    const email = loginIdToEmail(login_id);
    // Re-key the linked Auth account to the per-person email + password.
    const { error: updErr } = await supabase.auth.admin.updateUserById(profile.user_id, {
      email,
      password: login_id,
      email_confirm: true
    });
    if (updErr) throw new Error(`updateAuth ${role}: ${updErr.message}`);

    const { error: profErr } = await supabase
      .from("users")
      .update({ login_id })
      .eq("user_id", profile.user_id);
    if (profErr) throw new Error(`updateProfile ${role}: ${profErr.message}`);

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

    console.log(`✓ ${role}: per-person identity created -> login_id=${login_id} (password = login_id)`);
  }
  console.log("\nDone. Staff now sign in per-person at /login/[role] with their ID and password.");
}

main().catch((e) => {
  console.error("\n✗ Per-person staff provisioning failed:", e.message);
  process.exit(1);
});
