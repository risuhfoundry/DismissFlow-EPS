#!/usr/bin/env node
// DismissFlow EPS — Demo identity provisioning (Phase 4.6 helper).
//
// WHY THIS EXISTS
//   The audit found auth.users = 0 and public.users = 0, which blocks every
//   end-to-end flow. This script creates the required demo identities using REAL
//   Supabase Auth (never a fake login, never hardcoded credentials):
//     - one PARENT per seeded Tulip student (linked to that student)
//     - one TEACHER assigned to the Tulip class (classes.teacher_id set)
//     - one GATE  (role = gate)
//     - one ADMIN (role = admin)
//
// NO HARDCODING
//   - Parents are DERIVED from public.students (queried at runtime), so no student
//     name / admission number / UUID is written here.
//   - The email domain is configuration (env, with a demo default).
//   - Parent passwords follow the PRD §12 demo shortcut (admission number); they are
//     not stored in source — they come from the student row at runtime.
//   - Teacher/gate/admin passwords are taken from env OR generated and PRINTED (not
//     stored in source).
//   - The Tulip class is resolved from the database, never hardcoded.
//
// RUN (needs the service-role key — server only, never shipped to the browser):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   NEXT_PUBLIC_DEMO_EMAIL_DOMAIN=demo.dismissflow \
//   DEMO_TEACHER_PASSWORD=... DEMO_GATE_PASSWORD=... DEMO_ADMIN_PASSWORD=... \
//   node scripts/provision-demo-identities.mjs
//
// Idempotent: existing profiles / auth users are detected and reused.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_DEMO_EMAIL_DOMAIN || "demo.dismissflow";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing required env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Resolve an existing auth user id by email, or create one.
async function ensureAuthUser(email, password) {
  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = (list?.users || []).find((u) => u.email === email);
  if (existing) return { id: existing.id, created: false };

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { provider: "email" }
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return { id: data.user.id, created: true };
}

async function upsertProfile(profile) {
  const { data: existing } = await supabase
    .from("users")
    .select("user_id")
    .eq("user_id", profile.user_id)
    .maybeSingle();
  if (existing) return false;
  const { error } = await supabase.from("users").insert(profile);
  if (error) throw new Error(`insert users ${profile.user_id}: ${error.message}`);
  return true;
}

function randomPassword(bytes = 18) {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < bytes; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

const credentials = {}; // collected for the final summary

async function main() {
  // ---- Parents: derived from the live student roster (no hardcoded data) ----
  const { data: students, error: stuErr } = await supabase
    .from("students")
    .select("student_id, admission_no");
  if (stuErr) throw new Error(`students query: ${stuErr.message}`);
  if (!students || students.length === 0) {
    throw new Error("No students found. Seed Tulip data before provisioning.");
  }

  let parentsCreated = 0;
  for (const s of students) {
    const email = `${s.admission_no}@${DEMO_EMAIL_DOMAIN}`;
    const { id, created } = await ensureAuthUser(email, String(s.admission_no));
    const inserted = await upsertProfile({
      user_id: id,
      role: "parent",
      login_id: s.admission_no,
      linked_student_id: s.student_id,
      credential_status: "active"
    });
    if (created || inserted) parentsCreated++;
    credentials[`parent:${s.admission_no}`] = { email, password: s.admission_no };
  }

  // ---- Teacher: assigned to the Tulip class (resolved from DB) ----
  const { data: tulip } = await supabase
    .from("classes")
    .select("class_id, class_name")
    .eq("class_name", "Tulip")
    .maybeSingle();
  if (!tulip) throw new Error("Tulip class not found.");
  const teacherEmail = `teacher@${DEMO_EMAIL_DOMAIN}`;
  const teacherPassword = process.env.DEMO_TEACHER_PASSWORD || randomPassword();
  const teacher = await ensureAuthUser(teacherEmail, teacherPassword);
  await upsertProfile({
    user_id: teacher.id,
    role: "teacher",
    assigned_class_id: tulip.class_id,
    credential_status: "active"
  });
  // Wire the class to its teacher.
  const { error: clsErr } = await supabase
    .from("classes")
    .update({ teacher_id: teacher.id })
    .eq("class_id", tulip.class_id);
  if (clsErr) throw new Error(`set teacher_id: ${clsErr.message}`);
  credentials.teacher = { email: teacherEmail, password: teacherPassword };

  // ---- Gate ----
  const gateEmail = `gate@${DEMO_EMAIL_DOMAIN}`;
  const gatePassword = process.env.DEMO_GATE_PASSWORD || randomPassword();
  const gate = await ensureAuthUser(gateEmail, gatePassword);
  await upsertProfile({
    user_id: gate.id,
    role: "gate",
    credential_status: "active"
  });
  credentials.gate = { email: gateEmail, password: gatePassword };

  // ---- Admin ----
  const adminEmail = `admin@${DEMO_EMAIL_DOMAIN}`;
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || randomPassword();
  const admin = await ensureAuthUser(adminEmail, adminPassword);
  await upsertProfile({
    user_id: admin.id,
    role: "admin",
    credential_status: "active"
  });
  credentials.admin = { email: adminEmail, password: adminPassword };

  console.log(`\n✓ Provisioned. Parents touched: ${parentsCreated} (of ${students.length}).`);
  console.log("Generated/used demo credentials (PRD §12 — demo only):");
  for (const [role, c] of Object.entries(credentials)) {
    console.log(`  ${role.padEnd(18)} ${c.email}  /  ${c.password}`);
  }
  console.log(
    "\nParent login uses admission number as BOTH identifier and password (per PRD §12)."
  );
}

main().catch((e) => {
  console.error("\n✗ Provisioning failed:", e.message);
  process.exit(1);
});
