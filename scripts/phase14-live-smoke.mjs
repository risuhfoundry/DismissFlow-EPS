// Phase 14 — minimal live full-chain smoke test (self-cleaning proof).
// Parent create -> Gate scan -> Teacher approve, then the script prints the
// single temp request_id so this run can be deleted via MCP (no temp data left).
// Uses REAL anon-key clients + real role JWTs (the browser path). No service role.
import { createClient } from "@supabase/supabase-js";

// Phase 17: credentials are env-parameterized. Defaults point at the live
// per-person pilot identities (parent 041, gate GTE-1001, teacher TCH-1001).
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dmxqqvlnbwzkqfceyuot.supabase.co";
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteHFxdmxuYnd6a3FmY2V5dW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTk1MzUsImV4cCI6MjEwMzM3NTUzNX0.osCtD4y-u2-pmBWb3JZUMhPGalkKM5GiOcrc0ru825U";
const DOMAIN = process.env.NEXT_PUBLIC_DEMO_EMAIL_DOMAIN || "demo.dismissflow";
const EMAIL = (id) => `${id}@${DOMAIN}`;
const PARENT_LOGIN = process.env.E2E_PARENT_LOGIN ?? "041";
const PARENT_PW = process.env.E2E_PARENT_PASSWORD ?? PARENT_LOGIN;
const GATE_EMAIL = process.env.E2E_GATE_EMAIL ?? EMAIL("gte-1001");
const GATE_PW = process.env.E2E_GATE_PASSWORD ?? process.env.E2E_STAFF_PASSWORD ?? "GTE-1001";
const TEACHER_EMAIL = process.env.E2E_TEACHER_EMAIL ?? EMAIL("tch-1001");
const TEACHER_PW = process.env.E2E_TEACHER_PASSWORD ?? process.env.E2E_STAFF_PASSWORD ?? "TCH-1001";

const mk = () =>
  createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

async function invoke(c, fn, body) {
  const { data, error } = await c.functions.invoke(fn, { method: "POST", body });
  if (error) {
    const ctx = error.context;
    let code = null;
    try {
      const b = await ctx.json();
      code = b?.error?.code ?? b?.code ?? null;
    } catch {}
    return { ok: false, code, data: null };
  }
  return { ok: true, code: null, data };
}

const out = [];
const check = (name, ok, detail) => {
  out.push(`${ok ? "PASS" : "FAIL"} ${name} — ${detail}`);
  if (!ok) console.log(`  [FAIL] ${name} — ${detail}`);
};

const parent = mk();
await parent.auth.signInWithPassword({ email: EMAIL(PARENT_LOGIN), password: PARENT_PW });
const gate = mk();
await gate.auth.signInWithPassword({ email: GATE_EMAIL, password: GATE_PW });
const teacher = mk();
await teacher.auth.signInWithPassword({ email: TEACHER_EMAIL, password: TEACHER_PW });

// 1. Parent create
const created = await invoke(parent, "create-dismissal-request", {});
check("parent create returns token once", created.ok && !!created.data?.token, `req=${created.data?.request_id ?? created.code}`);
const reqId = created.data?.request_id;

// 2. Gate scan (valid) -> AWAITING_TEACHER
const scanned = await invoke(gate, "scan-qr", { token: created.data.token });
check("gate scan -> AWAITING_TEACHER", scanned.ok && scanned.data?.status === "AWAITING_TEACHER", `status=${scanned.data?.status ?? scanned.code}`);

// 3. Teacher approve -> DISMISSED
const decided = await invoke(teacher, "approve-dismissal", { request_id: reqId });
check("teacher approve -> DISMISSED", decided.ok && decided.data?.status === "DISMISSED", `status=${decided.data?.status ?? decided.code}`);

// 4. Server-derived audit: scanned_by=gate, approved_by=teacher
const { data: ev } = await teacher
  .from("dismissal_events")
  .select("scanned_by, approved_by, final_status")
  .eq("request_id", reqId)
  .maybeSingle();
const gateUser = (await gate.auth.getUser()).data.user.id;
const teacherUser = (await teacher.auth.getUser()).data.user.id;
check(
  "audit actor fields server-derived (gate scan, teacher approve)",
  ev?.scanned_by === gateUser && ev?.approved_by === teacherUser && ev?.final_status === "DISMISSED",
  `scanned_by=${ev?.scanned_by === gateUser} approved_by=${ev?.approved_by === teacherUser} final=${ev?.final_status}`
);

console.log("\n=== PHASE 14 LIVE SMOKE ===");
out.forEach((l) => console.log("  " + l));
console.log(`PHASE14_TEMP_REQUEST_IDS=${reqId ?? ""}`);
const allPass = out.every((l) => l.startsWith("PASS"));
console.log(allPass ? "LIVE: PASS" : "LIVE: FAIL");
process.exit(allPass ? 0 : 1);
