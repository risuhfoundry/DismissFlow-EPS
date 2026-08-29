// Phase 13 — SECURITY / AUTHORIZATION MATRIX (RLS × roles, RPC EXECUTE denial,
// Edge Function auth, CORS, QR token non-readability, class scoping, expiry).
//
// Every check uses a REAL authenticated Supabase client (public anon key + a real
// role JWT) — the exact path the browser uses. No service-role key is used.
// Temp fixtures created via MCP beforehand:
//   - expired QR: scan literal token "phase13-expired-token" -> QR_EXPIRED (410)
//   - temp teacher phase13temp@demo.dismissflow / Temp123! in class Phase13Temp
//     (used to prove live teacher class-scoping / TEACHER_CLASS_FORBIDDEN)
//
// Run: node scripts/security-phase13.mjs
import { createClient } from "@supabase/supabase-js";

const URL = "https://dmxqqvlnbwzkqfceyuot.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteHFxdmxuYnd6a3FmY2V5dW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTk1MzUsImV4cCI6MjEwMzM3NTUzNX0.osCtD4y-u2-pmBWb3JZUMhPGalkKM5GiOcrc0ru825U";

const ADMIN_PW = "E2eTest123!";
const TEACHER_PW = "E2eTest123!";
const GATE_PW = "E2eTest123!";
const PARENT_041_PW = "041";
const PARENT_5767_PW = "5767";
const TEMP_TEACHER_EMAIL = "phase13temp@demo.dismissflow";
const TEMP_TEACHER_PW = "Temp123!";
const EXPIRED_TOKEN = "phase13-expired-token";

const mk = () =>
  createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

const checks = [];
const check = (name, pass, detail) => {
  checks.push({ name, pass, detail });
  if (!pass) console.log(`  [FAIL] ${name} — ${detail}`);
};
const TEMP = new Set();

async function signIn(c, email, password) {
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return data.user.id;
}
async function count(client, table, extra) {
  let q = client.from(table).select("*", { count: "exact", head: true });
  if (extra) q = extra(q);
  const { count: c, error } = await q;
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return c ?? 0;
}

// Invoke a deployed Edge Function. Returns {ok, status, code, message, data}.
async function invoke(c, fn, body) {
  try {
    const { data, error } = await c.functions.invoke(fn, { method: "POST", body });
    if (error) {
      const ctx = error.context;
      const status = ctx?.status ?? null;
      let code = null, message = null;
      try {
        const b = await ctx.json();
        code = b?.error?.code ?? b?.code ?? null;
        message = b?.error?.message ?? b?.message ?? null;
      } catch {}
      return { ok: false, status, code, message, data: null };
    }
    return { ok: true, status: 200, code: null, message: null, data };
  } catch (e) {
    return { ok: false, status: null, code: null, message: String(e?.message ?? e), data: null };
  }
}

(async () => {
  const admin = mk();
  await signIn(admin, "admin@demo.dismissflow", ADMIN_PW);
  const parent = mk();
  await signIn(parent, "041@demo.dismissflow", PARENT_041_PW);
  const teacher = mk();
  await signIn(teacher, "teacher@demo.dismissflow", TEACHER_PW);
  const gate = mk();
  await signIn(gate, "gate@demo.dismissflow", GATE_PW);
  const p5767 = mk();
  await signIn(p5767, "5767@demo.dismissflow", PARENT_5767_PW);
  // Anonymous client — NO sign-in, exercises public/anon access.
  const anon = mk();

  const TABLES = [
    "users", "students", "classes", "guardians",
    "student_guardians", "dismissal_requests", "qr_tokens", "dismissal_events"
  ];

  // ===== §10 RLS MATRIX — qr_tokens must be 0 for EVERY role (never browser-readable) =====
  for (const [label, c] of [
    ["ANON", anon], ["PARENT", parent], ["TEACHER", teacher],
    ["GATE", gate], ["ADMIN", admin]
  ]) {
    const qr = await count(c, "qr_tokens");
    check(`§10 QR TOKEN ISOLATION: ${label} reads 0 qr_tokens`, qr === 0, `rows=${qr}`);
  }

  // ===== §10 / §17 ANONYMOUS reads NOTHING (no public data exposure) =====
  for (const t of TABLES) {
    const n = await count(anon, t);
    check(`§10 ANON: anonymous reads 0 from ${t}`, n === 0, `rows=${n}`);
  }

  // ===== §10 Role scoping (positive) =====
  const pUsers = await count(parent, "users");
  const pStudents = await count(parent, "students");
  check("§10 PARENT: reads only own user row (1)", pUsers === 1, `users=${pUsers}`);
  check("§10 PARENT: reads only linked student (1)", pStudents === 1, `students=${pStudents}`);

  const tUsers = await count(teacher, "users");
  const tStudents = await count(teacher, "students");
  const tGuardians = await count(teacher, "guardians");
  check("§10 TEACHER: reads only own user row (1)", tUsers === 1, `users=${tUsers}`);
  check("§10 TEACHER: reads class students (18)", tStudents === 18, `students=${tStudents}`);
  check("§10 TEACHER: reads class guardians (35)", tGuardians === 35, `guardians=${tGuardians}`);

  const gUsers = await count(gate, "users");
  const gStudents = await count(gate, "students");
  const gGuardians = await count(gate, "guardians");
  const gReqs = await count(gate, "dismissal_requests");
  check("§10 GATE: reads only own user row (1)", gUsers === 1, `users=${gUsers}`);
  check("§10 GATE: reads 0 students (PII protected)", gStudents === 0, `students=${gStudents}`);
  check("§10 GATE: reads 0 guardians (PII protected)", gGuardians === 0, `guardians=${gGuardians}`);
  check("§10 GATE: reads 0 dismissal_requests (no operational visibility)", gReqs === 0, `requests=${gReqs}`);

  const aStudents = await count(admin, "students");
  check("§10 ADMIN: can read all students (>0) but 0 qr_tokens", aStudents > 0, `students=${aStudents}`);

  // ===== §17 NO PII LEAK beyond linkage (parent sees only linked guardians) =====
  const { data: pLinked } = await parent.from("users").select("linked_student_id").eq("user_id", (await parent.auth.getUser()).data.user.id).single();
  const { data: linkedSG } = await admin.from("student_guardians").select("guardian_id").eq("student_id", pLinked.linked_student_id);
  const { data: pGuardians } = await parent.from("guardians").select("guardian_id");
  check(
    "§17 NO PII LEAK: parent sees only linked guardians",
    (pGuardians?.length ?? 0) === (linkedSG?.length ?? 0) && (linkedSG?.length ?? 0) > 0,
    `parent=${pGuardians?.length ?? 0} linked=${linkedSG?.length ?? 0}`
  );

  // ===== §11 RPC EXECUTE denial — browser roles cannot call the authority RPCs directly =====
  async function rpcDenied(c, fn, args) {
    const { data, error } = await c.rpc(fn, args);
    // A denied call returns error (permission denied / not allowed) — must NOT succeed.
    return !!error && data == null;
  }
  const rpcAnonScan = await rpcDenied(anon, "consume_qr_scan", { p_token_hash: "x", p_scanned_by: "y" });
  const rpcTeacherDecide = await rpcDenied(teacher, "teacher_decide_request", { p_request_id: "00000000-0000-0000-0000-000000000000", p_decision: "DISMISSED", p_teacher_id: "y" });
  const rpcParentCancel = await rpcDenied(parent, "parent_cancel_request", { p_request_id: "00000000-0000-0000-0000-000000000000", p_parent_id: "y" });
  check("§11 RPC: anon cannot execute consume_qr_scan", rpcAnonScan, `denied=${rpcAnonScan}`);
  check("§11 RPC: teacher cannot execute teacher_decide_request directly", rpcTeacherDecide, `denied=${rpcTeacherDecide}`);
  check("§11 RPC: parent cannot execute parent_cancel_request directly", rpcParentCancel, `denied=${rpcParentCancel}`);

  // ===== §12 / §15 EDGE FUNCTION AUTH (verify_jwt + role gating) =====
  // Helper: raw fetch so we control the Authorization header.
  async function rawFn(path, { method = "POST", token, body } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${URL}/functions/v1/${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    let code = null, message = null;
    try { const b = await res.json(); code = b?.error?.code ?? null; message = b?.error?.message ?? null; } catch {}
    return { status: res.status, code, message };
  }

  // Missing JWT -> 401 UNAUTHENTICATED
  const noAuth = await rawFn("scan-qr", { method: "POST", body: { token: "x" } });
  check("§15 EDGE AUTH: missing JWT -> 401", noAuth.status === 401, `status=${noAuth.status} code=${noAuth.code}`);

  // Invalid JWT -> 401
  const badAuth = await rawFn("scan-qr", { method: "POST", token: "not.a.real.jwt", body: { token: "x" } });
  check("§15 EDGE AUTH: invalid JWT -> 401", badAuth.status === 401, `status=${badAuth.status} code=${badAuth.code}`);

  // Wrong role: parent token on gate-only function -> 403 GATE_REQUIRED
  const parentToken = (await parent.auth.getSession()).data.session?.access_token;
  const wrongRole = await rawFn("scan-qr", { method: "POST", token: parentToken, body: { token: "x" } });
  check("§15 EDGE AUTH: wrong role (parent) on scan-qr -> 403 GATE_REQUIRED", wrongRole.status === 403 && wrongRole.code === "GATE_REQUIRED", `status=${wrongRole.status} code=${wrongRole.code}`);

  // Authorized gate scanning a qn invalid token still passes AUTH (-> 400 INVALID_QR, not 401)
  const gateToken = (await gate.auth.getSession()).data.session?.access_token;
  const gateAuthOk = await rawFn("scan-qr", { method: "POST", token: gateToken, body: { token: "definitely-not-real" } });
  check("§15 EDGE AUTH: authorized gate reaches auth (-> 400 INVALID_QR, not 401)", gateAuthOk.status === 400 && gateAuthOk.code === "INVALID_QR", `status=${gateAuthOk.status} code=${gateAuthOk.code}`);

  // ===== §16 CORS preflight =====
  const corsRes = await fetch(`${URL}/functions/v1/scan-qr`, {
    method: "OPTIONS",
    headers: {
      "Origin": "https://example.com",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type"
    }
  });
  const acao = corsRes.headers.get("access-control-allow-origin");
  check("§16 CORS: OPTIONS preflight -> 204", corsRes.status === 204, `status=${corsRes.status}`);
  check("§16 CORS: preflight echoes Access-Control-Allow-Origin", !!acao, `acao=${acao}`);

  // ===== §9 EXPIRY — expired QR is unscannable (live) =====
  const expScan = await rawFn("scan-qr", { method: "POST", token: gateToken, body: { token: EXPIRED_TOKEN } });
  check("§9 QR EXPIRY: expired QR -> QR_EXPIRED (410)", expScan.status === 410 && expScan.code === "QR_EXPIRED", `status=${expScan.status} code=${expScan.code}`);

  // ===== §6 / §13 TEACHER CLASS SCOPING (live, cross-class request) =====
  // A temp student in the separate "Phase13Temp" class owns an AWAITING_TEACHER
  // request (created via MCP). The real Tulip teacher approving it must be denied.
  const CT_REQ = "a979e7ef-40ff-42f8-b2df-51e075af87ce";
  const CT_STUDENT = "6de51b09-19e3-4f9b-bca3-7394b4b1e2a0";
  const ctBefore = await (async () => { const { data } = await admin.from("dismissal_requests").select("status").eq("request_id", CT_REQ).single(); return data?.status; })();
  check("§6 CLASS SCOPE SETUP: cross-class request pre-exists AWAITING_TEACHER", ctBefore === "AWAITING_TEACHER", `status=${ctBefore}`);
  const ctDecide = await invoke(teacher, "approve-dismissal", { request_id: CT_REQ });
  check("§6 TEACHER CLASS SCOPING: real Tulip teacher -> TEACHER_CLASS_FORBIDDEN (403)", !ctDecide.ok && ctDecide.code === "TEACHER_CLASS_FORBIDDEN", `code=${ctDecide.code} status=${ctDecide.status}`);
  // The forbidden decision must NOT mutate the request.
  const ctAfter = await (async () => { const { data } = await admin.from("dismissal_requests").select("status").eq("request_id", CT_REQ).single(); return data?.status; })();
  check("§6 TEACHER CLASS SCOPING: request unchanged after forbidden decision", ctAfter === "AWAITING_TEACHER", `status=${ctAfter}`);
  // Real teacher RLS must not expose the cross-class request.
  const { data: tReqs } = await teacher.from("dismissal_requests").select("request_id, student_id");
  const leakCross = (tReqs ?? []).some((r) => r.student_id === CT_STUDENT);
  check("§13 TEACHER ISOLATION: real teacher cannot see cross-class student's request", !leakCross, `leak=${leakCross}`);

  // ===== §17 RESPONSE SECRET SCAN — no token_hash / service-role / secret keys in any response =====
  const probe = await p5767.functions.invoke("create-dismissal-request", { method: "POST", body: {} });
  if (probe.data?.request_id) TEMP.add(probe.data.request_id);
  const probeStr = JSON.stringify(probe.data ?? {}).toLowerCase();
  const leak = /token_hash|service_role|eyj|secret|encrypted|password/.test(probeStr);
  check("§17 NO SECRET LEAK: create response lacks token_hash/service-role/secret", !leak, `body=${probeStr.slice(0, 80)}`);

  // ---- Report ----
  console.log("\n=== PHASE 13 SECURITY / AUTHORIZATION MATRIX ===");
  let allPass = true;
  for (const c of checks) {
    if (!c.pass) allPass = false;
    console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name} — ${c.detail}`);
  }
  console.log(`\nPHASE13_TEMP_REQUEST_IDS=${[...TEMP].join(",")}`);
  console.log(allPass ? "\nSECURITY: PASS" : "\nSECURITY: FAIL");
  process.exit(allPass ? 0 : 1);
})().catch((e) => {
  console.error("SECURITY ERROR:", e?.message ?? e);
  console.log(`PHASE13_TEMP_REQUEST_IDS=${[...TEMP].join(",")}`);
  process.exit(1);
});
