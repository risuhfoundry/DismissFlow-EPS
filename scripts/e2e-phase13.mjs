// Phase 13 — FULL SYSTEM E2E + HOSTILE BODY + CONCURRENCY + CANCELLATION.
//
// Every transition is driven through the REAL deployed Edge Functions using REAL
// role JWTs (public anon key only — the exact browser path). No service-role
// key is used anywhere in this script. The script asserts the security-critical
// properties from the Phase 13 audit: state machine transitions, server-only
// authority, hostile-body rejection, single-use QR, concurrency safety, and
// audit integrity. All temporary rows are tracked and printed for cleanup.
//
// Run: node scripts/e2e-phase13.mjs
import { createClient } from "@supabase/supabase-js";

const URL = "https://dmxqqvlnbwzkqfceyuot.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteHFxdmxuYnd6a3FmY2V5dW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTk1MzUsImV4cCI6MjEwMzM3NTUzNX0.osCtD4y-u2-pmBWb3JZUMhPGalkKM5GiOcrc0ru825U";

const ADMIN_PW = "process.env.E2E_STAFF_PASSWORD ?? "E2eTest123!"";
const TEACHER_PW = "process.env.E2E_STAFF_PASSWORD ?? "E2eTest123!"";
const GATE_PW = "process.env.E2E_STAFF_PASSWORD ?? "E2eTest123!"";
const PARENT_041_PW = "041";
const PARENT_5767_PW = "5767";

const mk = () =>
  createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

const checks = [];
const check = (name, pass, detail) => {
  checks.push({ name, pass, detail });
  if (!pass) console.log(`  [FAIL] ${name} — ${detail}`);
};
const TEMP = new Set();

async function signIn(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return data.user.id;
}

// Invoke a deployed Edge Function. Returns {ok, status, code, message, data}.
// On 2xx the body is returned; on non-2xx the structured {error:{code,message}}
// body is parsed (functions.invoke surfaces it via error.context).
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

async function reqStatus(admin, requestId) {
  const { data } = await admin
    .from("dismissal_requests")
    .select("status")
    .eq("request_id", requestId)
    .single();
  return data?.status ?? null;
}

(async () => {
  const admin = mk();
  const adminId = await signIn(admin, "admin@demo.dismissflow", ADMIN_PW);
  const p041 = mk();
  const p041Id = await signIn(p041, "041@demo.dismissflow", PARENT_041_PW);
  const p5767 = mk();
  const p5767Id = await signIn(p5767, "5767@demo.dismissflow", PARENT_5767_PW);
  const teacher = mk();
  const teacherId = await signIn(teacher, "teacher@demo.dismissflow", TEACHER_PW);
  const gate = mk();
  const gateId = await signIn(gate, "gate@demo.dismissflow", GATE_PW);

  check("AUTH: admin sign-in", !!adminId, `adminId=${adminId.slice(0, 8)}`);
  check("AUTH: parent 041 sign-in", !!p041Id, `pid=${p041Id.slice(0, 8)}`);
  check("AUTH: parent 5767 sign-in", !!p5767Id, `pid=${p5767Id.slice(0, 8)}`);
  check("AUTH: teacher sign-in", !!teacherId, `tid=${teacherId.slice(0, 8)}`);
  check("AUTH: gate sign-in", !!gateId, `gid=${gateId.slice(0, 8)}`);

  // Real linked student identity for 041 (fetched live, not hardcoded).
  const { data: p041User } = await p041
    .from("users")
    .select("linked_student_id, role")
    .eq("user_id", p041Id)
    .single();
  const s041 = p041User?.linked_student_id;
  check("PARENT 041: linked student resolved", !!s041, `student=${s041}`);
  const { data: s041row } = await admin
    .from("students")
    .select("name, class_id")
    .eq("student_id", s041)
    .single();
  const s041name = s041row?.name;
  check("PARENT 041: student name fetched (no hardcoded PII)", !!s041name, `name=${s041name}`);

  // Real linked student identity for 5767 (used for the hostile-body gate test).
  const { data: p5767User } = await p5767
    .from("users")
    .select("linked_student_id")
    .eq("user_id", p5767Id)
    .single();
  const s5767 = p5767User?.linked_student_id;
  const { data: s5767row } = await admin
    .from("students")
    .select("name")
    .eq("student_id", s5767)
    .single();
  const s5767name = s5767row?.name;
  check("PARENT 5767: student name fetched (no hardcoded PII)", !!s5767name, `name=${s5767name}`);

  // ===== §4 PARENT E2E: create request + QR security =====
  const createRes = await invoke(p041, "create-dismissal-request", {});
  check("PARENT E2E: create returns 2xx with token", createRes.ok && createRes.data?.token, `status=${createRes.status}`);
  const reqA = createRes.data?.request_id;
  const tokenA = createRes.data?.token;
  const expA = createRes.data?.expires_at;
  if (reqA) TEMP.add(reqA);

  // token cryptographically random + returned exactly once (response shape only)
  const tokRe = /^[A-Za-z0-9_-]{40,}$/;
  check("QR SECURITY: token is opaque random string", tokRe.test(tokenA ?? ""), `len=${(tokenA ?? "").length}`);
  // Server-authoritative expiry: client body was {}; expires_at must be ~now+3min, not client-set.
  const expDt = expA ? new Date(expA).getTime() : 0;
  const now = Date.now();
  const deltaMin = Math.abs(expDt - now) / 60000;
  check("QR EXPIRY: expires_at server-derived (~3 min ahead)", deltaMin > 1.5 && deltaMin < 6, `deltaMin=${deltaMin.toFixed(2)}`);

  // Response must NOT contain guardian PII or the token_hash or any plaintext.
  const respKeys = Object.keys(createRes.data ?? {});
  const leakedKey = respKeys.some((k) => /pii|guardian|name|email|phone|token_hash|hash|secret/i.test(k));
  check("QR SECURITY: response has no guardian PII / token_hash", !leakedKey, `keys=${respKeys.join(",")}`);

  // Duplicate active request rejected (one-active-per-student invariant).
  const dupRes = await invoke(p041, "create-dismissal-request", {});
  check("PARENT E2E: duplicate active request rejected (409)", !dupRes.ok && dupRes.status === 409, `status=${dupRes.status} code=${dupRes.code}`);

  // ===== §5 GATE E2E: valid scan + hostile body + invalid/missing =====
  const goodScan = await invoke(gate, "scan-qr", { token: tokenA });
  check("GATE E2E: valid QR -> AWAITING_TEACHER", goodScan.ok && goodScan.data?.status === "AWAITING_TEACHER", `status=${goodScan.status} out=${goodScan.data?.status}`);
  check("GATE E2E: scan returns real student (not injected)", goodScan.ok && goodScan.data?.student?.name === s041name, `name=${goodScan.data?.student?.name} expected=${s041name}`);

  // Hostile body — use a FRESH QR (created by 5767, who has no active request
  // here) so the scan itself is valid; extra fields must be ignored and the REAL
  // transition/student returned. Close it afterward so 5767 stays free for reqB.
  const hostileCreate = await invoke(p5767, "create-dismissal-request", {});
  const reqA2 = hostileCreate.data?.request_id;
  const tokenA2 = hostileCreate.data?.token;
  if (reqA2) TEMP.add(reqA2);
  const hostileScan = await invoke(gate, "scan-qr", {
    token: tokenA2,
    student_id: "00000000-0000-0000-0000-000000000000",
    request_id: "00000000-0000-0000-0000-000000000000",
    role: "admin",
    status: "DISMISSED",
    scanned_by: "00000000-0000-0000-0000-000000000000",
    teacher_id: "evil"
  });
  check("GATE HOSTILE BODY: fresh QR + extra fields ignored, AWAITING_TEACHER", hostileScan.ok && hostileScan.data?.status === "AWAITING_TEACHER", `status=${hostileScan.status}`);
  check("GATE HOSTILE BODY: returned student is the REAL student (not injected)", hostileScan.data?.student?.name === s5767name, `name=${hostileScan.data?.student?.name} expected=${s5767name}`);
  // Close reqA2 (teacher approve) so 5767 has no active request for the later reqB.
  const closeA2 = await invoke(teacher, "approve-dismissal", { request_id: reqA2 });
  check("GATE HOSTILE BODY: injected scan produced a real decision-able request", closeA2.ok && (await reqStatus(admin, reqA2)) === "DISMISSED", `status=${await reqStatus(admin, reqA2)}`);

  // Invalid token (random) -> safe 400.
  const invalidScan = await invoke(gate, "scan-qr", { token: "not-a-real-qr-token-value" });
  check("GATE E2E: invalid token -> INVALID_QR (400)", !invalidScan.ok && invalidScan.code === "INVALID_QR", `code=${invalidScan.code}`);

  // Missing token -> safe 400 (parseScanBody rejects).
  const missingScan = await invoke(gate, "scan-qr", {});
  check("GATE E2E: missing token -> INVALID_QR (400)", !missingScan.ok && missingScan.code === "INVALID_QR", `code=${missingScan.code}`);

  // Already-used QR (tokenA consumed) -> QR_ALREADY_USED (409).
  const reusedScan = await invoke(gate, "scan-qr", { token: tokenA });
  check("QR REUSE: used token -> QR_ALREADY_USED (409)", !reusedScan.ok && reusedScan.code === "QR_ALREADY_USED", `code=${reusedScan.code}`);

  check("STATE: reqA now AWAITING_TEACHER", (await reqStatus(admin, reqA)) === "AWAITING_TEACHER", `status=${await reqStatus(admin, reqA)}`);

  // ===== §7 PARENT CANCELLATION: cannot cancel after gate scan =====
  const cancelAfterScan = await invoke(p041, "cancel-dismissal", { request_id: reqA });
  check("CANCEL: cannot cancel after scan (REQUEST_NOT_CANCELLABLE)", !cancelAfterScan.ok && cancelAfterScan.code === "REQUEST_NOT_CANCELLABLE", `code=${cancelAfterScan.code}`);

  // ===== §8 CONCURRENT TEACHER DECISIONS on reqA =====
  // Fire two teacher approvals simultaneously -> exactly one success.
  const [d1, d2] = await Promise.all([
    invoke(teacher, "approve-dismissal", { request_id: reqA }),
    invoke(teacher, "approve-dismissal", { request_id: reqA })
  ]);
  const dOk = [d1, d2].filter((r) => r.ok).length;
  const dRej = [d1, d2].filter((r) => !r.ok && r.code === "REQUEST_NOT_AWAITING_TEACHER").length;
  check("CONCURRENCY: exactly one teacher decision succeeds", dOk === 1, `ok=${dOk}`);
  check("CONCURRENCY: loser gets REQUEST_NOT_AWAITING_TEACHER", dRej === 1, `rejected=${dRej}`);
  check("STATE: reqA now DISMISSED", (await reqStatus(admin, reqA)) === "DISMISSED", `status=${await reqStatus(admin, reqA)}`);

  // §14 AUDIT INTEGRITY — grouped count across all temp requests (single query,
  // robust against per-row burst throttling) + detail reads with error capture.
  const grouped = await admin
    .from("dismissal_events")
    .select("request_id")
    .in("request_id", [...TEMP]);
  const evCountByReq = {};
  for (const r of grouped.data ?? []) {
    evCountByReq[r.request_id] = (evCountByReq[r.request_id] ?? 0) + 1;
  }
  const grpErr = grouped.error;
  for (const id of TEMP) {
    check(
      `AUDIT: ${id} has exactly ONE audit event`,
      !grpErr && evCountByReq[id] === 1,
      `count=${evCountByReq[id] ?? 0} err=${grpErr?.message ?? "none"}`
    );
  }

  // Detail reads (actor integrity) — capture errors so a transport blip is visible.
  async function readEvent(id) {
    const { data, error } = await admin
      .from("dismissal_events")
      .select("event_id, request_id, scanned_by, approved_by, final_status")
      .eq("request_id", id)
      .maybeSingle();
    return { row: data, error };
  }
  const evA = await readEvent(reqA);
  const evA0 = evA.row;
  check("AUDIT: reqA scanned_by == gate identity (no forged actor)", evA0?.scanned_by === gateId, `scanned_by=${evA0?.scanned_by} gate=${gateId} err=${evA.error?.message ?? "none"}`);
  check("AUDIT: reqA approved_by == teacher identity (no forged actor)", evA0?.approved_by === teacherId, `approved_by=${evA0?.approved_by} teacher=${teacherId}`);
  check("AUDIT: reqA final_status == DISMISSED", evA0?.final_status === "DISMISSED", `final=${evA0?.final_status}`);

  // ===== §6 TEACHER E2E with injected fields on a FRESH request (reqB / 5767) =====
  const createB = await invoke(p5767, "create-dismissal-request", {});
  const reqB = createB.data?.request_id;
  const tokenB = createB.data?.token;
  if (reqB) TEMP.add(reqB);
  const scanB = await invoke(gate, "scan-qr", { token: tokenB });
  check("TEACHER SETUP: reqB scanned -> AWAITING_TEACHER", scanB.ok && (await reqStatus(admin, reqB)) === "AWAITING_TEACHER", `status=${await reqStatus(admin, reqB)}`);

  // Injected approve body — injected teacher_id/student_id/approved_by must be ignored.
  const injectApprove = await invoke(teacher, "approve-dismissal", {
    request_id: reqB,
    student_id: "00000000-0000-0000-0000-000000000000",
    teacher_id: "evil-teacher",
    class_id: "evil-class",
    role: "parent",
    status: "REJECTED",
    approved_by: "evil"
  });
  check("TEACHER HOSTILE BODY: injected fields ignored, DISMISSED", injectApprove.ok && injectApprove.data?.status === "DISMISSED", `status=${injectApprove.data?.status}`);
  const evB = await readEvent(reqB);
  check("TEACHER HOSTILE BODY: approved_by == real teacher (not injected)", evB.row?.approved_by === teacherId, `approved_by=${evB.row?.approved_by} err=${evB.error?.message ?? "none"}`);
  check("TEACHER HOSTILE BODY: final_status == DISMISSED (injected REJECTED ignored)", evB.row?.final_status === "DISMISSED", `final=${evB.row?.final_status}`);

  // ===== §7 CORRECT/WROTe PARENT CANCELLATION on reqC (5767) =====
  const createC = await invoke(p5767, "create-dismissal-request", {});
  const reqC = createC.data?.request_id;
  const tokenC = createC.data?.token;
  if (reqC) TEMP.add(reqC);
  // Wrong parent (041) cannot cancel 5767's request.
  const wrongCancel = await invoke(p041, "cancel-dismissal", { request_id: reqC });
  check("CANCEL: wrong parent cannot cancel (PARENT_STUDENT_FORBIDDEN)", !wrongCancel.ok && wrongCancel.code === "PARENT_STUDENT_FORBIDDEN", `code=${wrongCancel.code}`);
  // Correct parent cancels -> CANCELLED, exactly one event, cancelled QR unusable.
  const rightCancel = await invoke(p5767, "cancel-dismissal", { request_id: reqC });
  check("CANCEL: correct parent cancels REQUESTED -> CANCELLED", rightCancel.ok && (await reqStatus(admin, reqC)) === "CANCELLED", `status=${await reqStatus(admin, reqC)}`);
  const evC = await readEvent(reqC);
  check("CANCEL AUDIT: reqC final_status CANCELLED, no scan actor", evC.row?.final_status === "CANCELLED" && evC.row?.scanned_by == null, `final=${evC.row?.final_status} err=${evC.error?.message ?? "none"}`);
  const cancelledQr = await invoke(gate, "scan-qr", { token: tokenC });
  check("CANCEL: cancelled QR is unusable (safe error, no transition)", !cancelledQr.ok && (await reqStatus(admin, reqC)) === "CANCELLED", `code=${cancelledQr.code}`);

  // ===== §8 CANCEL vs DECISION RACE on reqD (5767) =====
  const createD = await invoke(p5767, "create-dismissal-request", {});
  const reqD = createD.data?.request_id;
  const tokenD = createD.data?.token;
  if (reqD) TEMP.add(reqD);
  const scanD = await invoke(gate, "scan-qr", { token: tokenD });
  check("RACE SETUP: reqD scanned -> AWAITING_TEACHER", scanD.ok && (await reqStatus(admin, reqD)) === "AWAITING_TEACHER", `status=${await reqStatus(admin, reqD)}`);
  // Fire approve + cancel concurrently -> exactly one valid final state.
  const [raceApprove, raceCancel] = await Promise.all([
    invoke(teacher, "approve-dismissal", { request_id: reqD }),
    invoke(p5767, "cancel-dismissal", { request_id: reqD })
  ]);
  const finalD = await reqStatus(admin, reqD);
  const oneWinner = (raceApprove.ok ? 1 : 0) + (raceCancel.ok ? 1 : 0);
  check("RACE: exactly one of {approve,cancel} succeeds", oneWinner === 1, `approveOk=${raceApprove.ok} cancelOk=${raceCancel.ok}`);
  check("RACE: final state is consistent (DISMISSED or CANCELLED)", finalD === "DISMISSED" || finalD === "CANCELLED", `final=${finalD}`);
  const { data: evD } = await admin
    .from("dismissal_events")
    .select("event_id, final_status")
    .eq("request_id", reqD);
  check("RACE AUDIT: exactly ONE event (no duplicate audit)", (evD?.length ?? 0) === 1, `count=${evD?.length}`);
  // The loser must have received a correct rejection code.
  const loserCode = !raceApprove.ok ? raceApprove.code : !raceCancel.ok ? raceCancel.code : null;
  const loserOk = finalD === "DISMISSED"
    ? (loserCode === "REQUEST_NOT_CANCELLABLE" || loserCode === "REQUEST_NOT_AWAITING_TEACHER")
    : (loserCode === "REQUEST_NOT_AWAITING_TEACHER");
  check("RACE: loser rejected with correct code", !!loserOk, `loserCode=${loserCode} final=${finalD}`);

  // ---- Report ----
  console.log("\n=== PHASE 13 E2E / CONCURRENCY / CANCELLATION TESTS ===");
  let allPass = true;
  for (const c of checks) {
    if (!c.pass) allPass = false;
    console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name} — ${c.detail}`);
  }
  console.log(`\nPHASE13_TEMP_REQUEST_IDS=${[...TEMP].join(",")}`);
  console.log(allPass ? "\nE2E: PASS" : "\nE2E: FAIL");
  process.exit(allPass ? 0 : 1);
})().catch((e) => {
  console.error("E2E ERROR:", e?.message ?? e);
  console.log(`PHASE13_TEMP_REQUEST_IDS=${[...TEMP].join(",")}`);
  process.exit(1);
});
