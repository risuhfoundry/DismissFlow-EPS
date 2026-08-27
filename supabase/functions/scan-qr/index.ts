// DismissFlow EPS — scan-qr Edge Function (authoritative, Phase 4).
//
// Docs/architecture.md §11.2, Phase 4 STEP 11–19.
//
// TRUST BOUNDARY: trusted Supabase Edge Function runtime. It is the ONLY place
// that authenticates the caller and enforces role = gate. The Gate client sends
// ONLY { token }; everything else (student, request, role, status, scanned_by)
// is derived server-side. The service-role key is used ONLY here (never in the
// browser) to bypass RLS and to call the trusted consume_qr_scan() RPC.
//
// The actual scan workflow (validation + atomic single-use consume + state
// transition + audit) lives inside the consume_qr_scan() RPC
// (supabase/migrations/0003_scan_qr.sql) so it is atomic and cannot be invoked
// directly by a client (EXECUTE is granted to service_role only).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sha256Hex } from "../create-dismissal-request/crypto.ts";
import {
  parseScanBody,
  mapRpcResult,
  mapRpcError
} from "../_shared/scan-contract.ts";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function errorResponse(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status);
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
  }

  // 1. Authenticate the caller from the Authorization header (never the body).
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser(jwt);

  if (authError || !user) {
    return errorResponse("UNAUTHENTICATED", "Authentication required.", 401);
  }

  // 2. Resolve application profile + enforce role = gate. Non-gate roles
  //    (parent / teacher / admin) are rejected with 403 GATE_REQUIRED.
  const { data: profile, error: pErr } = await supabase
    .from("users")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (pErr || !profile) {
    return errorResponse("FORBIDDEN", "No application profile.", 403);
  }
  if (profile.role !== "gate") {
    return errorResponse("GATE_REQUIRED", "Gate role required.", 403);
  }

  // 3. Parse the ONLY trusted client input: the scanned token. Extra fields are
  //    ignored by parseScanBody (we never trust them).
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    // malformed JSON -> treated as invalid below
  }
  const parsed = parseScanBody(body);
  if (!parsed) {
    return errorResponse("INVALID_QR", "QR code is invalid.", 400);
  }

  // 4. Hash with the SAME SHA-256 scheme as createDismissalRequest() so the
  //    lookup matches the stored token_hash. The plaintext token is never
  //    logged or stored.
  const tokenHash = await sha256Hex(parsed.token);

  // 5. Delegate the atomic scan to the trusted RPC (service role only).
  const { data, error } = await supabase.rpc("consume_qr_scan", {
    p_token_hash: tokenHash,
    p_scanned_by: user.id
  });

  if (error) {
    // A raised exception (e.g. REQUEST_NOT_SCANNABLE) surfaces here.
    const code = (error as { message?: string }).message ?? "";
    const mapped = mapRpcError(code);
    return errorResponse(mapped.code, mapped.message, mapped.status);
  }

  // rpc() with a TABLE-returning function yields an array; take the single row.
  const row = (Array.isArray(data) ? data[0] : data) as
    | Parameters<typeof mapRpcResult>[0]
    | undefined;
  if (!row) {
    return errorResponse("INTERNAL_ERROR", "Scan returned no result.", 500);
  }

  const outcome = mapRpcResult(row);
  if (outcome.ok) {
    return json(outcome.body, outcome.status);
  }
  return errorResponse(outcome.code, outcome.message, outcome.status);
});
