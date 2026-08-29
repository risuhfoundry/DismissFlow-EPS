// Phase 10 — REAL end-to-end test of the Teacher approve/reject flow.
//
// Drives the ACTUAL Edge Functions (create-dismissal-request, scan-qr,
// approve-dismissal, reject-dismissal) with REAL Supabase Auth JWTs for the
// provisioned parent / gate / teacher demo accounts. No service-role key is used
// in the browser-equivalent path; every call is authenticated as a real role and
// authorized server-side by RLS + the trusted RPCs.
//
// Run: node scripts/e2e-phase10.mjs
import { createClient } from "@supabase/supabase-js";

const URL = "https://dmxqqvlnbwzkqfceyuot.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteHFxdmxuYnd6a3FmY2V5dW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTk1MzUsImV4cCI6MjEwMzM3NTUzNX0.osCtD4y-u2-pmBWb3JZUMhPGalkKM5GiOcrc0ru825U";
const TEACHER_PW = "E2eTest123!";
const GATE_PW = "E2eTest123!";

const mk = () =>
  createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

async function signIn(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return data.user.id;
}

async function runFlow(admission, decision) {
  const out = { admission, decision, steps: [], requestId: null };
  const parent = mk();
  const parentId = await signIn(
    parent,
    `${admission}@demo.dismissflow`,
    admission
  );
  out.steps.push(["parent sign-in", true, parentId]);

  // 1. Parent creates a real request.
  const { data: created, error: cErr } = await parent.functions.invoke(
    "create-dismissal-request",
    { method: "POST", body: {} }
  );
  if (cErr) throw new Error(`create: ${cErr.message}`);
  const { request_id: requestId, token } = created;
  out.requestId = requestId;
  out.steps.push(["create-dismissal-request -> REQUESTED", true, requestId]);

  // 2. Gate scans the QR (real gate JWT, real token).
  const gate = mk();
  await signIn(gate, "gate@demo.dismissflow", GATE_PW);
  const { data: scan, error: sErr } = await gate.functions.invoke("scan-qr", {
    method: "POST",
    body: { token }
  });
  if (sErr) throw new Error(`scan: ${sErr.message}`);
  if (!scan.valid || scan.status !== "AWAITING_TEACHER") {
    throw new Error(`scan unexpected: ${JSON.stringify(scan)}`);
  }
  out.steps.push([
    "scan-qr -> AWAITING_TEACHER",
    true,
    `${scan.student.name} / ${scan.student.class}`
  ]);

  // 3. Teacher decides (real teacher JWT; sends ONLY request_id).
  const teacher = mk();
  const teacherId = await signIn(
    teacher,
    "teacher@demo.dismissflow",
    TEACHER_PW
  );
  const fn = decision === "approve" ? "approve-dismissal" : "reject-dismissal";
  const { data: dec, error: dErr } = await teacher.functions.invoke(fn, {
    method: "POST",
    body: { request_id: requestId }
  });
  if (dErr) throw new Error(`decide(${fn}): ${dErr.message}`);
  const want = decision === "approve" ? "DISMISSED" : "REJECTED";
  if (!dec.success || dec.status !== want) {
    throw new Error(`decide unexpected: ${JSON.stringify(dec)}`);
  }
  out.steps.push([`${fn} -> ${dec.status}`, true, requestId]);

  // 4. Authoritative verification via the teacher client (RLS-scoped, no
  //    service role). Confirms status + exactly one immutable audit event.
  const { data: req, error: rErr } = await teacher
    .from("dismissal_requests")
    .select("status")
    .eq("request_id", requestId)
    .single();
  if (rErr) throw new Error(`verify request: ${rErr.message}`);
  const { data: events, error: eErr } = await teacher
    .from("dismissal_events")
    .select("*")
    .eq("request_id", requestId);
  if (eErr) throw new Error(`verify events: ${eErr.message}`);

  const ev = events[0] || {};
  const ok =
    req.status === want &&
    events.length === 1 &&
    ev.final_status === want &&
    ev.approved_by === teacherId &&
    ev.scan_time !== null &&
    ev.approval_time !== null;
  out.verify = {
    status: req.status,
    events: events.length,
    final_status: ev.final_status,
    approved_by_matches_teacher: ev.approved_by === teacherId,
    scan_time_set: ev.scan_time !== null,
    approval_time_set: ev.approval_time !== null,
    ok
  };
  out.steps.push([
    "verify status + audit event",
    ok,
    `status=${req.status} events=${events.length}`
  ]);
  return out;
}

(async () => {
  const results = [];
  results.push(await runFlow("041", "approve"));
  results.push(await runFlow("5767", "reject"));

  for (const r of results) {
    console.log(`\n=== ${r.admission} / ${r.decision} ===`);
    for (const [name, ok, detail] of r.steps) {
      console.log(`  [${ok ? "PASS" : "FAIL"}] ${name} — ${detail}`);
    }
    console.log(`  VERIFY: ${JSON.stringify(r.verify)}`);
  }
  const allOk = results.every((r) => r.verify.ok);
  console.log(allOk ? "\nE2E: PASS" : "\nE2E: FAIL");
  // Echo request ids so cleanup can delete exactly these test rows.
  console.log(
    "TEST_REQUEST_IDS=" + results.map((r) => r.requestId).join(",")
  );
  process.exit(allOk ? 0 : 1);
})().catch((e) => {
  console.error("E2E ERROR:", e.message);
  process.exit(1);
});
