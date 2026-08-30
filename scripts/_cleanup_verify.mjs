#!/usr/bin/env node
// One-time cleanup of Phase 17 verification test artifacts (run-1 leftovers).
// Deletes ONLY clearly-labelled test rows; no real pilot data touched.

import { readFileSync } from "node:fs";
try {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
} catch {}
const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SR) { console.error("missing env"); process.exit(1); }
const { createClient } = await import("@supabase/supabase-js");
const svc = createClient(URL, SR, { auth: { persistSession: false, autoRefreshToken: false } });

const TEST_LOGINS = ["TST-PAR-01", "TST-TEA-01", "TST-ROSE-PAR", "TST-ROSE-GTE"];
const TEST_ADM = ["R-001", "Z-REAP"];
const rm = async (p) => { try { await p; } catch (e) { console.log("  skip:", e?.message); } };

const { data: users } = await svc.from("users").select("user_id, login_id").in("login_id", TEST_LOGINS);
const uids = (users || []).map((u) => u.user_id);
console.log("test user_ids:", uids.length, uids);
const { data: stus } = await svc.from("students").select("student_id, admission_no").in("admission_no", TEST_ADM);
const sids = (stus || []).map((s) => s.student_id);
console.log("test student_ids:", sids.length, sids);

// requests tied to test students
const { data: reqs } = await svc.from("dismissal_requests").select("request_id").in("student_id", sids);
const rids = (reqs || []).map((r) => r.request_id);
for (const rid of rids) {
  await rm(svc.from("dismissal_events").delete().eq("request_id", rid));
  await rm(svc.from("qr_tokens").delete().eq("request_id", rid));
  await rm(svc.from("dismissal_requests").delete().eq("request_id", rid));
}
console.log("removed test requests:", rids.length);

for (const uid of uids) { await rm(svc.auth.admin.deleteUser(uid)); }
for (const uid of uids) { await rm(svc.from("users").delete().eq("user_id", uid)); }
for (const sid of sids) { await rm(svc.from("students").delete().eq("student_id", sid)); }
await rm(svc.from("classes").delete().eq("class_name", "Rose-1"));
const { data: sch } = await svc.from("schools").select("school_id").eq("name", "Rose School");
for (const s of (sch || [])) { await rm(svc.from("schools").delete().eq("school_id", s.school_id)); }
console.log("cleanup complete.");
