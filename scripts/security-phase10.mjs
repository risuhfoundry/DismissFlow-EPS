// Phase 10 — SECURITY tests for the Teacher portal.
//
// Every check below uses a REAL authenticated Supabase client (anon key + real
// role JWT) — the exact path the browser uses. No service-role key. We assert
// that authorization is enforced server-side by RLS + the trusted Edge Functions
// / RPCs, never by the client.
//
// Run: node scripts/security-phase10.mjs
import { createClient } from "@supabase/supabase-js";

const URL = "https://dmxqqvlnbwzkqfceyuot.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteHFxdmxuYnd6a3FmY2V5dW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTk1MzUsImV4cCI6MjEwMzM3NTUzNX0.osCtD4y-u2-pmBWb3JZUMhPGalkKM5GiOcrc0ru825U";
const TEACHER_PW = "process.env.E2E_STAFF_PASSWORD ?? "E2eTest123!"";
const GATE_PW = "process.env.E2E_STAFF_PASSWORD ?? "E2eTest123!"";

const OWN_DISMISSED = "280ad324-2d02-4155-8b36-ca95b9d5b49c"; // 041, DISMISSED
const OTHER_REJECTED = "5c3c5cb4-10c7-4175-933f-0b958bedbe2f"; // 5767, REJECTED
const OTHER_CLASS_REQ = "13c9d48c-07fc-4b59-97f4-563b2c077717"; // SEC999, other class
const OWN_CLASS_REQ = "eca6fd8f-0627-4178-ab06-8c2ce4275917"; // SEC888, Tulip
const OWN_CLASS_STU = "a8790e57-9c3d-47b0-82b3-e6eb24c561b4";

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

// Invoke a function and normalize the response into {ok, status, code}.
async function invokeFn(client, fn, body) {
  const { data, error } = await client.functions.invoke(fn, {
    method: "POST",
    body
  });
  if (error) {
    const resp = error.context;
    const status = resp?.status ?? null;
    let code = null;
    try {
      const b = await resp.json();
      code = b?.error?.code ?? null;
    } catch {
      /* ignore */
    }
    return { ok: false, status, code, data: null };
  }
  return { ok: true, status: 200, code: null, data };
}

(async () => {
  // ---- RLS: a parent may only read their OWN linked student's requests. ----
  const parent = mk();
  await signIn(parent, "041@demo.dismissflow", "041");
  const { data: ownRead, error: ownErr } = await parent
    .from("dismissal_requests")
    .select("request_id")
    .eq("request_id", OWN_DISMISSED);
  check(
    "parent CAN read own linked request (RLS allow)",
    !ownErr && (ownRead?.length ?? 0) === 1,
    `rows=${(ownRead || []).length}`
  );
  const { data: crossRead, error: crossErr } = await parent
    .from("dismissal_requests")
    .select("request_id")
    .eq("request_id", OTHER_REJECTED);
  check(
    "parent CANNOT read another student's request (RLS deny)",
    !crossErr && (crossRead?.length ?? 0) === 0,
    `rows=${(crossRead || []).length}`
  );

  // ---- RLS: the gate role has NO select policy on dismissal_requests. ----
  const gate = mk();
  await signIn(gate, "gate@demo.dismissflow", GATE_PW);
  const { data: gateRead, error: gateErr } = await gate
    .from("dismissal_requests")
    .select("request_id")
    .eq("request_id", OTHER_REJECTED);
  check(
    "gate CANNOT read dismissal_requests (no select policy)",
    !gateErr && (gateRead?.length ?? 0) === 0,
    `rows=${(gateRead || []).length}`
  );

  // ---- A parent calling approve-dismissal is rejected (not a teacher). ----
  const pApprove = await invokeFn(parent, "approve-dismissal", {
    request_id: OTHER_CLASS_REQ
  });
  check(
    "parent approve-dismissal -> 403 TEACHER_REQUIRED",
    pApprove.status === 403 && pApprove.code === "TEACHER_REQUIRED",
    `status=${pApprove.status} code=${pApprove.code}`
  );

  // ---- The gate calling approve-dismissal is rejected (not a teacher). ----
  const gApprove = await invokeFn(gate, "approve-dismissal", {
    request_id: OTHER_CLASS_REQ
  });
  check(
    "gate approve-dismissal -> 403 TEACHER_REQUIRED",
    gApprove.status === 403 && gApprove.code === "TEACHER_REQUIRED",
    `status=${gApprove.status} code=${gApprove.code}`
  );

  // ---- The teacher cannot decide a request from another class. ----
  const teacher = mk();
  const teacherId = await signIn(
    teacher,
    "teacher@demo.dismissflow",
    TEACHER_PW
  );
  const classForbidden = await invokeFn(teacher, "approve-dismissal", {
    request_id: OTHER_CLASS_REQ
  });
  check(
    "teacher approve OTHER-class request -> 403 TEACHER_CLASS_FORBIDDEN",
    classForbidden.status === 403 &&
      classForbidden.code === "TEACHER_CLASS_FORBIDDEN",
    `status=${classForbidden.status} code=${classForbidden.code}`
  );

  // ---- Duplicate / already-decided request is rejected (atomic, idempotent). ----
  const dup = await invokeFn(teacher, "approve-dismissal", {
    request_id: OWN_DISMISSED
  });
  check(
    "teacher re-approve DISMISSED request -> 409 REQUEST_NOT_AWAITING_TEACHER",
    dup.status === 409 && dup.code === "REQUEST_NOT_AWAITING_TEACHER",
    `status=${dup.status} code=${dup.code}`
  );

  // ---- Client-injected authority fields are ignored; server uses the real
  //      request's student + the JWT's teacher. ----
  const injected = await invokeFn(teacher, "approve-dismissal", {
    request_id: OWN_CLASS_REQ,
    status: "REJECTED", // attacker tries to force REJECTED
    student_id: "evil-uuid",
    class_id: "evil-uuid",
    teacher_id: "evil-uuid",
    approved_by: "evil-uuid"
  });
  check(
    "teacher approve w/ injected fields -> 200 DISMISSED (ignored)",
    injected.ok && injected.data?.status === "DISMISSED",
    `status=${injected.data?.status}`
  );
  // Verify the row kept its REAL student and became DISMISSED, and the audit
  // event attributes the decision to the REAL teacher, not the injected one.
  const { data: reqRow } = await teacher
    .from("dismissal_requests")
    .select("student_id, status")
    .eq("request_id", OWN_CLASS_REQ)
    .single();
  const { data: ev } = await teacher
    .from("dismissal_events")
    .select("*")
    .eq("request_id", OWN_CLASS_REQ);
  const realStudent =
    reqRow?.student_id === OWN_CLASS_STU && reqRow?.status === "DISMISSED";
  const realTeacherAttr =
    (ev?.[0]?.approved_by ?? null) === teacherId &&
    ev?.[0]?.final_status === "DISMISSED" &&
    ev?.length === 1;
  check(
    "server used REAL student + REAL teacher (injection had no effect)",
    realStudent && realTeacherAttr,
    `student_ok=${realStudent} teacher_attr_ok=${realTeacherAttr}`
  );

  // ---- Clients cannot call the trusted RPC directly (EXECUTE revoked). ----
  const { error: rpcErr } = await teacher.rpc("teacher_decide_request", {
    p_request_id: OWN_CLASS_REQ,
    p_decision: "DISMISSED",
    p_teacher_id: teacherId
  });
  check(
    "direct RPC call from client is denied (cannot supply teacher_id)",
    !!rpcErr,
    `err=${rpcErr?.message || rpcErr?.code || "none"}`
  );

  // ---- Report ----
  console.log("\n=== SECURITY TESTS ===");
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
