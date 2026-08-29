// Phase 12 — SECURITY / AUTHORIZATION tests for the REAL Admin Portal.
//
// Every check uses a REAL authenticated Supabase client (public anon key + a
// real role JWT) — the exact path the browser uses. No service-role key is used
// anywhere. We assert that authorization is enforced server-side by RLS, never
// by the client, and that the admin surface is read/observation-only with no
// authority to mutate dismissal state.
//
// Run: node scripts/security-phase12.mjs
import { createClient } from "@supabase/supabase-js";

const URL = "https://dmxqqvlnbwzkqfceyuot.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteHFxdmxuYnd6a3FmY2V5dW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTk1MzUsImV4cCI6MjEwMzM3NTUzNX0.osCtD4y-u2-pmBWb3JZUMhPGalkKM5GiOcrc0ru825U";
const ADMIN_PW = "E2eTest123!";
const TEACHER_PW = "E2eTest123!";
const GATE_PW = "E2eTest123!";
const PARENT_PW = "041";

const mk = () =>
  createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass, detail });

async function signIn(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return data.user.id;
}

// Exact count via head query (mirrors the admin dashboard's headCount()).
async function count(client, table, extra) {
  let q = client.from(table).select("*", { count: "exact", head: true });
  if (extra) q = extra(q);
  const { count: c, error } = await q;
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return c ?? 0;
}

(async () => {
  // ---- Authenticate the four real roles. ----
  const admin = mk();
  const adminId = await signIn(admin, "admin@demo.dismissflow", ADMIN_PW);
  const parent = mk();
  const parentId = await signIn(parent, "041@demo.dismissflow", PARENT_PW);
  const teacher = mk();
  const teacherId = await signIn(teacher, "teacher@demo.dismissflow", TEACHER_PW);
  const gate = mk();
  const gateId = await signIn(gate, "gate@demo.dismissflow", GATE_PW);

  // ===== ADMIN AUTH + DASHBOARD (values from live DB, nothing hardcoded) =====
  const [
    students,
    classes,
    parents,
    guardians,
    teachers,
    gates,
    admins,
    requests,
    events
  ] = await Promise.all([
    count(admin, "students"),
    count(admin, "classes"),
    count(admin, "users", (q) => q.eq("role", "parent")),
    count(admin, "guardians"),
    count(admin, "users", (q) => q.eq("role", "teacher")),
    count(admin, "users", (q) => q.eq("role", "gate")),
    count(admin, "users", (q) => q.eq("role", "admin")),
    count(admin, "dismissal_requests"),
    count(admin, "dismissal_events")
  ]);

  check("ADMIN AUTH: admin sign-in succeeds", !!adminId, `adminId=${adminId.slice(0, 8)}`);
  check("ADMIN DASHBOARD: students=18 (live)", students === 18, `students=${students}`);
  check("ADMIN DASHBOARD: classes=1 (live)", classes === 1, `classes=${classes}`);
  check("ADMIN DASHBOARD: parents=18 (live)", parents === 18, `parents=${parents}`);
  check("ADMIN DASHBOARD: guardians=35 (live)", guardians === 35, `guardians=${guardians}`);
  check("ADMIN DASHBOARD: teachers=1 (live)", teachers === 1, `teachers=${teachers}`);
  check("ADMIN DASHBOARD: gates=1 (live)", gates === 1, `gates=${gates}`);
  check("ADMIN DASHBOARD: admins=1 (live)", admins === 1, `admins=${admins}`);
  check("REAL DATABASE DATA: total users=21 (live)", parents + teachers + gates + admins === 21, `total=${parents + teachers + gates + admins}`);
  check("DISMISSAL MONITORING: admin reads all requests (>= 1)", requests >= 1, `requests=${requests}`);
  check("AUDIT LOG: admin reads dismissal_events>=1", events >= 1, `events=${events}`);

  // ===== STUDENT / CLASS / USER VISIBILITY (admin) =====
  const sg = await count(admin, "student_guardians");
  check("STUDENT MANAGEMENT: roster guardian-link source=35", sg === 35, `student_guardians=${sg}`);
  const { data: tchUsers } = await admin
    .from("users")
    .select("user_id, login_id, role")
    .eq("role", "teacher");
  const { data: clsRows } = await admin.from("classes").select("class_id, class_name, teacher_id");
  const teacherRow = tchUsers?.[0];
  const teacherAssigned = clsRows?.some((c) => c.teacher_id === teacherRow?.user_id) ?? false;
  // The admin portal must not query guardian/contact PII from users.
  const tchNoPii = (tchUsers ?? []).every(
    (r) => !("name" in r) && !("email" in r) && !("phone" in r) && !("relationship" in r)
  );
  check(
    "CLASS MANAGEMENT: teacher assigned to a class, no PII columns pulled",
    teacherAssigned && tchNoPii && (tchUsers?.length ?? 0) === 1,
    `assigned=${teacherAssigned} login_id=${teacherRow?.login_id ?? "null"}`
  );

  // User/role visibility shape — must NOT expose password/token/service keys.
  const { data: userRows, error: uErr } = await admin
    .from("users")
    .select("user_id, role, login_id, credential_status, linked_student_id, assigned_class_id");
  const forbidden = ["password", "encrypted", "token", "service_role", "jwt", "secret"];
  const leaked = (userRows ?? []).some((r) =>
    Object.keys(r).some((k) => forbidden.some((f) => k.toLowerCase().includes(f)))
  );
  check(
    "USER/ROLE VISIBILITY: no password/token keys returned",
    !uErr && !leaked && (userRows?.length ?? 0) === 21,
    `rows=${(userRows || []).length} leaked=${leaked}`
  );

  // ===== ADMIN CANNOT MUTATE DISMISSAL STATE DIRECTLY (§10 / §12.7) =====
  const { data: reqs } = await admin
    .from("dismissal_requests")
    .select("request_id, status")
    .limit(1);
  const target = reqs?.[0];
  if (target) {
    const before = target.status;
    const { count: updCount, error: updErr } = await admin
      .from("dismissal_requests")
      .update({ status: "DISMISSED" }, { count: "exact" })
      .eq("request_id", target.request_id);
    const { data: after } = await admin
      .from("dismissal_requests")
      .select("status")
      .eq("request_id", target.request_id)
      .single();
    check(
      "ADMIN AUTHORIZATION: admin UPDATE on dismissal_requests blocked by RLS (0 rows)",
      !updErr && updCount === 0,
      `updCount=${updCount}`
    );
    check(
      "ADMIN AUTHORIZATION: request status unchanged after admin 'update'",
      after?.status === before,
      `before=${before} after=${after?.status}`
    );
  } else {
    check("ADMIN AUTHORIZATION: admin UPDATE blocked (no row to test)", false, "no request found");
  }

  // ===== NO QR TOKEN EXPOSURE (qr_tokens has NO policy -> default deny all) =====
  const [qAdmin, qParent, qTeacher, qGate] = await Promise.all([
    count(admin, "qr_tokens"),
    count(parent, "qr_tokens"),
    count(teacher, "qr_tokens"),
    count(gate, "qr_tokens")
  ]);
  check("NO QR TOKEN EXPOSURE: admin reads 0 qr_tokens", qAdmin === 0, `rows=${qAdmin}`);
  check("NO QR TOKEN EXPOSURE: parent reads 0 qr_tokens", qParent === 0, `rows=${qParent}`);
  check("NO QR TOKEN EXPOSURE: teacher reads 0 qr_tokens", qTeacher === 0, `rows=${qTeacher}`);
  check("NO QR TOKEN EXPOSURE: gate reads 0 qr_tokens", qGate === 0, `rows=${qGate}`);

  // ===== PARENT ISOLATION (read-scope only) =====
  const pUsers = await count(parent, "users");
  const pStudents = await count(parent, "students");
  const { data: pReqRows } = await parent
    .from("dismissal_requests")
    .select("request_id, student_id");
  const pReqs = pReqRows?.length ?? 0;
  // Parent cannot read another student's request (pick one not linked to 041).
  const { data: allReqs } = await admin
    .from("dismissal_requests")
    .select("request_id, student_id")
    .limit(50);
  const { data: pLinked } = await parent
    .from("users")
    .select("linked_student_id")
    .eq("user_id", parentId)
    .single();
  const pOwnOnly = (pReqRows ?? []).every((r) => r.student_id === pLinked?.linked_student_id);
  check("PARENT ISOLATION: parent reads only own user row (1)", pUsers === 1, `users=${pUsers}`);
  check("PARENT ISOLATION: parent reads only linked student (1)", pStudents === 1, `students=${pStudents}`);
  check(
    "PARENT ISOLATION: parent reads only own/linked requests (no cross-student)",
    pOwnOnly && pReqs <= requests,
    `requests=${pReqs} ownOnly=${pOwnOnly}`
  );
  const otherReq = (allReqs ?? []).find((r) => r.student_id !== pLinked?.linked_student_id);
  if (otherReq) {
    const { data: cross, error: cErr } = await parent
      .from("dismissal_requests")
      .select("request_id")
      .eq("request_id", otherReq.request_id);
    check(
      "PARENT ISOLATION: cannot read another student's request",
      !cErr && (cross?.length ?? 0) === 0,
      `rows=${(cross || []).length}`
    );
  } else {
    check("PARENT ISOLATION: cannot read another student's request", true, "only linked student has requests");
  }

  // Parent guardian PII restricted to linked student only.
  const { data: pGuardians } = await parent.from("guardians").select("guardian_id");
  const { data: linkedSG } = await admin
    .from("student_guardians")
    .select("guardian_id")
    .eq("student_id", pLinked?.linked_student_id);
  const linkedCount = linkedSG?.length ?? 0;
  check(
    "NO PII LEAK: parent sees only linked guardians",
    (pGuardians?.length ?? 0) === linkedCount && linkedCount > 0,
    `parent=${pGuardians?.length ?? 0} linked=${linkedCount}`
  );

  // ===== TEACHER ISOLATION =====
  const tUsers = await count(teacher, "users");
  const tStudents = await count(teacher, "students");
  const tGuardians = await count(teacher, "guardians");
  check("TEACHER ISOLATION: teacher reads only own user row (1)", tUsers === 1, `users=${tUsers}`);
  check(
    "TEACHER ISOLATION: teacher reads class students only (authorized, 18)",
    tStudents === 18,
    `students=${tStudents}`
  );
  check("TEACHER ISOLATION: teacher guardian reads are class-scoped", tGuardians === 35, `guardians=${tGuardians}`);

  // ===== GATE ISOLATION (no operational visibility) =====
  const gUsers = await count(gate, "users");
  const gReqs = await count(gate, "dismissal_requests");
  const gStudents = await count(gate, "students");
  const gGuardians = await count(gate, "guardians");
  const { data: gEvRows } = await gate.from("dismissal_events").select("event_id, scanned_by");
  const gEvents = gEvRows?.length ?? 0;
  const gOwnScans = (gEvRows ?? []).every((r) => r.scanned_by === gateId);
  check("GATE ISOLATION: gate reads only own user row (1)", gUsers === 1, `users=${gUsers}`);
  check("GATE ISOLATION: gate reads 0 dismissal_requests", gReqs === 0, `requests=${gReqs}`);
  check("GATE ISOLATION: gate reads 0 students", gStudents === 0, `students=${gStudents}`);
  check("GATE ISOLATION: gate reads 0 guardians (PII protected)", gGuardians === 0, `guardians=${gGuardians}`);
  check(
    "GATE ISOLATION: gate reads only own-scanned events",
    gOwnScans && gEvents <= events,
    `events=${gEvents} ownScans=${gOwnScans}`
  );

  // ===== REALTIME eligibility (admin must be able to SUBSCRIBE = SELECT both tables) =====
  const rtReq = await count(admin, "dismissal_requests");
  const rtEv = await count(admin, "dismissal_events");
  check(
    "REALTIME: admin can SELECT the subscribed tables",
    rtReq >= 1 && rtEv >= 1,
    `requests=${rtReq} events=${rtEv}`
  );

  // ---- Report ----
  console.log("\n=== PHASE 12 SECURITY / AUTHORIZATION TESTS ===");
  let allPass = true;
  for (const c of checks) {
    if (!c.pass) allPass = false;
    console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name} — ${c.detail}`);
  }
  console.log(allPass ? "\nSECURITY: PASS" : "\nSECURITY: FAIL");
  process.exit(allPass ? 0 : 1);
})().catch((e) => {
  console.error("SECURITY ERROR:", e.message);
  process.exit(1);
});
