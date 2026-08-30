#!/usr/bin/env node
// Phase 17 LIVE VERIFICATION — run against the real Supabase project.
//
// Exercises (and then CLEANS UP) every Phase 17 property against live data:
//   A) Per-person staff login (TCH-1001 / GTE-1001 / ADM-1001).
//   B) Real identity lifecycle via manage-identity (create/reset/activate/
//      deactivate/assign/unassign/link/unlink) + per-school confinement.
//   C) Full parent→gate→teacher dismissal flow through the deployed Edge
//      Functions; asserts school_id is written onto request + event.
//   D) Cross-school tenant isolation: Rose School (second tenant) is created; a
//      Tulip gate/teacher must be REJECTED when touching Rose data (RPC guards)
//      and a Tulip admin must not SEE Rose rows (RLS).
//   E) QR reaper (reap_expired_requests) flips an expired unscanned request.
//
// All test data is created under clearly-labelled identifiers and removed in a
// finally block. No real pilot data is deleted.

import { readFileSync } from "node:fs";

// Minimal .env.local loader (no secrets echoed).
try {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
} catch { /* rely on externally supplied env */ }

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DOMAIN = process.env.NEXT_PUBLIC_DEMO_EMAIL_DOMAIN || "demo.dismissflow";

if (!URL || !ANON || !SR) {
  console.error("Missing SUPABASE_URL / anon / service_role env.");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const anon = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const svc = createClient(URL, SR, { auth: { persistSession: false, autoRefreshToken: false } });

const loginToEmail = (id) => `${String(id).trim().toLowerCase()}@${DOMAIN}`;

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? " :: " + detail : ""}`);
}

// Sign in with the anon browser client and return the session user's role/login_id.
async function signIn(loginId, password) {
  const { data, error } = await anon.auth.signInWithPassword({
    email: loginToEmail(loginId),
    password
  });
  if (error || !data.user) return { ok: false, error };
  const { data: prof } = await anon.from("users").select("role, login_id, school_id").eq("user_id", data.user.id).maybeSingle();
  return { ok: true, role: prof?.role, loginId: prof?.login_id, schoolId: prof?.school_id, userId: data.user.id };
}

async function invoke(action, body) {
  const { data, error } = await anon.functions.invoke("manage-identity", { method: "POST", body: { action, ...body } });
  if (error) {
    let code;
    try { const b = await error.context?.json?.(); code = b?.error?.code; } catch {}
    return { ok: false, code: code || error.message, error };
  }
  return { ok: true, data };
}

// Track test artifacts for cleanup.
const testAuthUsers = []; // auth user ids
const testAppUsers = [];  // public.users ids (no auth)
const testStudents = [];
const testClasses = [];
const testSchools = [];
const testRequests = [];

async function makePerson({ loginId, password, role, schoolId, studentId, classId }) {
  const email = loginToEmail(loginId);
  const { data: au, error: ce } = await svc.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { role, login_id: loginId }
  });
  if (ce || !au.user) throw new Error(`createAuth ${loginId}: ${ce?.message}`);
  testAuthUsers.push(au.user.id);
  const { data: u, error: ie } = await svc.from("users").insert({
    user_id: au.user.id, role, login_id: loginId, school_id: schoolId,
    linked_student_id: studentId ?? null, assigned_class_id: classId ?? null,
    credential_status: "active"
  }).select("user_id").single();
  if (ie) throw new Error(`insertUser ${loginId}: ${ie.message}`);
  testAppUsers.push(u.user_id);
  return au.user.id;
}

let tulipSchool = null;
let tulipStudent = null;
let tulipClass = null;

try {
  // ---- discover Tulip school + a Tulip student/class for the flow test ----
  const { data: schools } = await svc.from("schools").select("school_id, name");
  tulipSchool = schools?.find((s) => s.name === "Tulip School")?.school_id
    || schools?.[0]?.school_id;
  check("Tulip school present", !!tulipSchool, tulipSchool ?? "");
  const { data: stus } = await svc.from("students").select("student_id, name, admission_no").eq("school_id", tulipSchool).limit(1);
  tulipStudent = stus?.[0]?.student_id;
  check("Tulip student available for parent link", !!tulipStudent, tulipStudent ?? "");
  const { data: cls } = await svc.from("classes").select("class_id, class_name").eq("school_id", tulipSchool).limit(1);
  tulipClass = cls?.[0]?.class_id;
  check("Tulip class available for teacher assign", !!tulipClass, tulipClass ?? "");

  // ===================== A) PER-PERSON STAFF LOGIN =====================
  for (const [id, role] of [["TCH-1001", "teacher"], ["GTE-1001", "gate"], ["ADM-1001", "admin"]]) {
    const r = await signIn(id, id);
    check(`per-person login ${id} -> ${role}`, r.ok && r.role === role, r.ok ? `role=${r.role} school=${r.schoolId}` : r.error?.message);
    await anon.auth.signOut();
  }

  // ===================== B) IDENTITY LIFECYCLE =====================
  // Sign in as Tulip admin.
  const adm = await signIn("ADM-1001", "ADM-1001");
  check("admin session for lifecycle", adm.ok && adm.role === "admin");

  // create a Tulip parent linked to tulipStudent
  const c1 = await invoke("create", { role: "parent", login_id: "TST-PAR-01", student_id: tulipStudent });
  check("lifecycle: create parent", c1.ok && !!c1.data?.plaintext_password, c1.ok ? `pw=${c1.data.plaintext_password}` : c1.code);
  const parId = c1.data?.user?.user_id;
  const parLogin = "TST-PAR-01";
  testAuthUsers.push(parId); testAppUsers.push(parId);

  // re-login as the newly created parent
  await anon.auth.signOut();
  const pl = await signIn(parLogin, parLogin);
  check("lifecycle: new parent can sign in", pl.ok && pl.role === "parent", pl.ok ? `role=${pl.role}` : pl.error?.message);
  await anon.auth.signOut();

  // reset (back to ADM-1001 first)
  const adm2 = await signIn("ADM-1001", "ADM-1001");
  const r1 = await invoke("reset", { target_user_id: parId });
  check("lifecycle: reset returns one-time password", r1.ok && !!r1.data?.plaintext_password, r1.ok ? `pw=${r1.data.plaintext_password}` : r1.code);

  // deactivate then sign-in must fail
  const d1 = await invoke("deactivate", { target_user_id: parId });
  check("lifecycle: deactivate", d1.ok && d1.data?.credential_status === "inactive", d1.ok ? d1.data?.credential_status : d1.code);
  await anon.auth.signOut();
  const dead = await signIn(parLogin, parLogin);
  check("lifecycle: deactivated cannot sign in", !dead.ok, dead.error?.message || "signed in (BAD)");
  // reactivate
  const adm3 = await signIn("ADM-1001", "ADM-1001");
  const a1 = await invoke("activate", { target_user_id: parId });
  check("lifecycle: activate", a1.ok && a1.data?.credential_status === "active", a1.ok ? a1.data?.credential_status : a1.code);
  await anon.auth.signOut();
  const alive = await signIn(parLogin, parLogin);
  check("lifecycle: reactivated can sign in", alive.ok, alive.error?.message || "");
  await anon.auth.signOut();

  // create teacher + assign/unassign class
  const adm4 = await signIn("ADM-1001", "ADM-1001");
  const c2 = await invoke("create", { role: "teacher", login_id: "TST-TEA-01", class_id: tulipClass });
  check("lifecycle: create teacher", c2.ok, c2.ok ? `pw=${c2.data?.plaintext_password}` : c2.code);
  const teaId = c2.data?.user?.user_id;
  testAuthUsers.push(teaId); testAppUsers.push(teaId);
  const as1 = await invoke("assign", { target_user_id: teaId, class_id: tulipClass });
  check("lifecycle: assign class", as1.ok && as1.data?.assigned_class_id === tulipClass, as1.ok ? `class=${as1.data?.assigned_class_id}` : as1.code);
  const un1 = await invoke("unassign", { target_user_id: teaId });
  check("lifecycle: unassign class", un1.ok && un1.data?.assigned_class_id === null, un1.ok ? "null" : un1.code);

  // link/unlink student on parent
  const lk = await invoke("link", { target_user_id: parId, student_id: tulipStudent });
  check("lifecycle: link student", lk.ok && lk.data?.linked_student_id === tulipStudent, lk.ok ? "ok" : lk.code);
  const ul = await invoke("unlink", { target_user_id: parId });
  check("lifecycle: unlink student", ul.ok && ul.data?.linked_student_id === null, ul.ok ? "null" : ul.code);

  // ===================== D) CROSS-SCHOOL: build Rose School tenant =====================
  const { data: rose } = await svc.from("schools").insert({ name: "Rose School" }).select("school_id").single();
  testSchools.push(rose.school_id);
  const roseSchool = rose.school_id;
  const { data: roseCls } = await svc.from("classes").insert({ class_name: "Rose-1", school_id: roseSchool }).select("class_id").single();
  testClasses.push(roseCls.class_id);
  const { data: roseStu } = await svc.from("students").insert({
    admission_no: "R-001", name: "Rose Test Student", class_id: roseCls.class_id, school_id: roseSchool
  }).select("student_id").single();
  testStudents.push(roseStu.student_id);
  // Rose parent + Rose gate (auth-backed so we can sign in + invoke functions)
  await makePerson({ loginId: "TST-ROSE-PAR", password: "TST-ROSE-PAR", role: "parent", schoolId: roseSchool, studentId: roseStu.student_id });
  await makePerson({ loginId: "TST-ROSE-GTE", password: "TST-ROSE-GTE", role: "gate", schoolId: roseSchool });
  const roseParId = testAppUsers[testAppUsers.length - 2];
  const roseGateId = testAppUsers[testAppUsers.length - 1];

  // A SECOND Rose student + parent so a fresh, un-scanned request can be created
  // for the cross-school gate-scan test (the one-active-request invariant blocks
  // a repeat request for the SAME student, so we use a different student).
  const { data: roseStu2 } = await svc.from("students").insert({
    admission_no: "R-002", name: "Rose Test Student 2", class_id: roseCls.class_id, school_id: roseSchool
  }).select("student_id").single();
  testStudents.push(roseStu2.student_id);
  await makePerson({ loginId: "TST-ROSE-PAR2", password: "TST-ROSE-PAR2", role: "parent", schoolId: roseSchool, studentId: roseStu2.student_id });

  // SCHOOL_FORBIDDEN: Tulip admin tries to manage a Rose identity.
  const adm5 = await signIn("ADM-1001", "ADM-1001");
  const sf = await invoke("reset", { target_user_id: roseParId });
  check("lifecycle: cross-school reset forbidden (SCHOOL_FORBIDDEN)", !sf.ok && sf.code === "SCHOOL_FORBIDDEN", sf.ok ? "allowed (BAD)" : sf.code);

  // ===================== C) FULL DISMISSAL FLOW (Tulip) =====================
  // Re-link parent to tulip student (needed for create-dismissal-request).
  await invoke("link", { target_user_id: parId, student_id: tulipStudent });
  await anon.auth.signOut();
  const parFlow = await signIn("TST-PAR-01", "TST-PAR-01");
  check("flow: parent login", parFlow.ok);
  const { data: creq, error: crerr } = await anon.functions.invoke("create-dismissal-request", { method: "POST", body: {} });
  if (crerr) {
    let code; try { const b = await crerr.context?.json?.(); code = b?.error?.code; } catch {}
    check("flow: create-dismissal-request", false, code || crerr.message);
  } else {
    const rid = creq?.request_id;
    testRequests.push(rid);
    check("flow: create-dismissal-request returns token", !!rid && !!creq?.token, rid ? "ok" : "no request_id");
    // verify school_id written on the request
    const { data: reqRow } = await svc.from("dismissal_requests").select("school_id, student_id, status").eq("request_id", rid).maybeSingle();
    check("flow: request carries Tulip school_id", reqRow?.school_id === tulipSchool, `school=${reqRow?.school_id}`);

    // Tulip gate scans
    await anon.auth.signOut();
    const gte = await signIn("GTE-1001", "GTE-1001");
    const { data: scan, error: serr } = await anon.functions.invoke("scan-qr", { method: "POST", body: { token: creq.token } });
    if (serr) { let code; try { const b = await serr.context?.json?.(); code = b?.error?.code; } catch {} check("flow: scan by Tulip gate", false, code || serr.message); }
    else check("flow: scan by Tulip gate -> AWAITING_TEACHER", scan?.status === "AWAITING_TEACHER", `status=${scan?.status}`);
    // verify dismissal_events school_id
    const { data: ev } = await svc.from("dismissal_events").select("school_id, final_status").eq("request_id", rid).maybeSingle();
    check("flow: dismissal_event carries Tulip school_id", ev?.school_id === tulipSchool, `school=${ev?.school_id}`);

    // Tulip teacher approves
    await anon.auth.signOut();
    const tch = await signIn("TCH-1001", "TCH-1001");
    const { data: appr, error: aerr } = await anon.functions.invoke("approve-dismissal", { method: "POST", body: { request_id: rid } });
    if (aerr) { let code; try { const b = await aerr.context?.json?.(); code = b?.error?.code; } catch {} check("flow: teacher approve", false, code || aerr.message); }
    else check("flow: teacher approve -> DISMISSED", appr?.status === "DISMISSED", `status=${appr?.status}`);
    await anon.auth.signOut();
  }

  // ===================== D) CROSS-SCHOOL RPC REJECTION =====================
  // Rose parent creates a real Rose request.
  const rosePar = await signIn("TST-ROSE-PAR", "TST-ROSE-PAR");
  check("xschool: Rose parent login", rosePar.ok);
  const { data: rcreq, error: rcrerr } = await anon.functions.invoke("create-dismissal-request", { method: "POST", body: {} });
  if (rcrerr) { let code; try { const b = await rcrerr.context?.json?.(); code = b?.error?.code; } catch {} check("xschool: Rose parent create request", false, code || rcrerr.message); }
  else {
    const rrid = rcreq?.request_id;
    testRequests.push(rrid);
    // Rose gate scans (positive within-tenant)
    await anon.auth.signOut();
    const rgate = await signIn("TST-ROSE-GTE", "TST-ROSE-GTE");
    const { data: rscan, error: rserr } = await anon.functions.invoke("scan-qr", { method: "POST", body: { token: rcreq.token } });
    if (rserr) { let code; try { const b = await rserr.context?.json?.(); code = b?.error?.code; } catch {} check("xschool: Rose gate scans Rose QR (positive)", false, code || rserr.message); }
    else check("xschool: Rose gate scans Rose QR -> AWAITING_TEACHER", rscan?.status === "AWAITING_TEACHER", `status=${rscan?.status}`);

    // Fresh, UN-SCANNED Rose request so the Tulip gate hits the cross-school
    // guard BEFORE the token is consumed (proves isolation, not just idempotency).
    await anon.auth.signOut();
    const rosePar2 = await signIn("TST-ROSE-PAR2", "TST-ROSE-PAR2");
    const { data: rcreq2, error: rcrerr2 } = await anon.functions.invoke("create-dismissal-request", { method: "POST", body: {} });
    if (rcrerr2) { let code; try { const b = await rcrerr2.context?.json?.(); code = b?.error?.code; } catch {} check("xschool: Rose parent create request #2", false, code || rcrerr2.message); }
    else {
      const rrid2 = rcreq2?.request_id;
      testRequests.push(rrid2);
      await anon.auth.signOut();
      const tg = await signIn("GTE-1001", "GTE-1001");
      const { data: tscan, error: tserr } = await anon.functions.invoke("scan-qr", { method: "POST", body: { token: rcreq2.token } });
      const tcode = tserr ? (await (async () => { try { const b = await tserr.context?.json?.(); return b?.error?.code; } catch { return tserr.message; } })()) : null;
      check("xschool: Tulip gate scanning Rose QR forbidden", !!tserr && tcode === "GATE_SCHOOL_FORBIDDEN", tcode || JSON.stringify(tscan));
      await anon.auth.signOut();
    }

    // Tulip teacher decides the Rose request -> must be FORBIDDEN
    await anon.auth.signOut();
    const tt = await signIn("TCH-1001", "TCH-1001");
    const { data: tdec, error: tderr } = await anon.functions.invoke("approve-dismissal", { method: "POST", body: { request_id: rrid } });
    const dcode = tderr ? (await (async () => { try { const b = await tderr.context?.json?.(); return b?.error?.code; } catch { return tderr.message; } })()) : null;
    check("xschool: Tulip teacher deciding Rose request forbidden", !!tderr && dcode === "TEACHER_SCHOOL_FORBIDDEN", dcode || JSON.stringify(tdec));
    await anon.auth.signOut();

    // Rose request still AWAITING_TEACHER (untouched by Tulip actors)
    const { data: rreq } = await svc.from("dismissal_requests").select("status").eq("request_id", rrid).maybeSingle();
    check("xschool: Rose request unchanged (still AWAITING_TEACHER)", rreq?.status === "AWAITING_TEACHER", `status=${rreq?.status}`);
  }

  // RLS: Tulip admin must NOT see Rose rows.
  await signIn("ADM-1001", "ADM-1001");
  const { data: seen } = await anon.from("users").select("login_id").eq("school_id", roseSchool);
  const roseVisible = (seen || []).some((u) => ["TST-ROSE-PAR", "TST-ROSE-GTE"].includes(u.login_id));
  check("xschool: RLS hides Rose users from Tulip admin", !roseVisible, `roseVisible=${roseVisible}`);
  await anon.auth.signOut();

  // ===================== E) QR REAPER =====================
  // Insert an expired, un-scanned Tulip request (fresh student to avoid the
  // one-active-request unique index colliding with in-flight requests).
  const { data: reapStu } = await svc.from("students").insert({
    admission_no: "Z-REAP", name: "Reaper Test", class_id: tulipClass, school_id: tulipSchool
  }).select("student_id").single();
  testStudents.push(reapStu.student_id);
  const { data: reapReq } = await svc.from("dismissal_requests").insert({
    student_id: reapStu.student_id, school_id: tulipSchool, status: "REQUESTED",
    expires_at: new Date(Date.now() - 3600_000).toISOString()
  }).select("request_id").single();
  testRequests.push(reapReq.request_id);
  const { data: reapN, error: reapErr } = await svc.rpc("reap_expired_requests");
  check("reaper: reap_expired_requests runs", !reapErr && typeof reapN === "number" && reapN >= 1, reapErr ? reapErr.message : `count=${reapN}`);
  const { data: after } = await svc.from("dismissal_requests").select("status").eq("request_id", reapReq.request_id).maybeSingle();
  check("reaper: expired unscanned request -> EXPIRED", after?.status === "EXPIRED", `status=${after?.status}`);

} catch (e) {
  check("SCRIPT UNCAUGHT", false, e?.message || String(e));
} finally {
  // ---- CLEANUP (non-destructive to real data) ----
  console.log("\n--- cleanup ---");
  const rm = async (p) => { try { await p; } catch { /* ignore */ } };
  for (const rid of testRequests) {
    await rm(svc.from("dismissal_events").delete().eq("request_id", rid));
    await rm(svc.from("qr_tokens").delete().eq("request_id", rid));
    await rm(svc.from("dismissal_requests").delete().eq("request_id", rid));
  }
  for (const uid of testAuthUsers) { await rm(svc.auth.admin.deleteUser(uid)); }
  for (const uid of testAppUsers) { await rm(svc.from("users").delete().eq("user_id", uid)); }
  for (const sid of testStudents) { await rm(svc.from("students").delete().eq("student_id", sid)); }
  for (const cid of testClasses) { await rm(svc.from("classes").delete().eq("class_id", cid)); }
  for (const sch of testSchools) { await rm(svc.from("schools").delete().eq("school_id", sch)); }
  console.log("cleanup done.");
}

const failed = results.filter((r) => !r.ok);
console.log(`\n==== SUMMARY: ${results.length - failed.length}/${results.length} passed ====`);
process.exit(failed.length === 0 ? 0 : 2);
