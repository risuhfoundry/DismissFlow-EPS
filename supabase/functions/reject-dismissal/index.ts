// DismissFlow EPS — reject-dismissal Edge Function (authoritative, Phase 5).
//
// Docs/architecture.md §11.4, Phase 5 STEP 9.
//
// TRUST BOUNDARY: trusted Supabase Edge Function runtime. Identical trust model to
// approve-dismissal (see that file). The Teacher client sends ONLY { request_id };
// the rejection actor is derived from the authenticated identity, never the body.
//
// The actual decision workflow lives inside the teacher_decide_request() RPC
// (supabase/migrations/0007_teacher_decision.sql). This function is a thin wrapper
// that supplies the fixed decision 'REJECTED' and otherwise reuses the shared
// decision contract and the same authorization checks as approve-dismissal.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  parseDecisionBody,
  mapRpcDecision,
  mapDecisionError,
  json,
  errorResponse,
  corsHeaders
} from "../_shared/decision-contract.ts";

const DECISION = "REJECTED" as const;

serve(async (req: Request) => {
  const origin = req.headers.get("Origin");

  // Preflight: browsers send OPTIONS before the credentialed POST. Respond with
  // CORS headers and no body so the real request is allowed through. verify_jwt
  // (enforced by the gateway) does not apply to preflights, and the actual POST
  // still requires a valid JWT + teacher role below.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405, origin);
  }

  // All error responses below carry CORS headers via this closure over `origin`.
  function err(code: string, message: string, status: number): Response {
    return errorResponse(code, message, status, origin);
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
    return err("UNAUTHENTICATED", "Authentication required.", 401);
  }

  // 2. Resolve application profile + enforce role = teacher.
  const { data: profile, error: pErr } = await supabase
    .from("users")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (pErr || !profile) {
    return err("FORBIDDEN", "No application profile.", 403);
  }
  if (profile.role !== "teacher") {
    return err("TEACHER_REQUIRED", "Teacher role required.", 403);
  }

  // 3. Parse the ONLY trusted client input: the request reference.
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    // malformed JSON -> treated as invalid below
  }
  const parsed = parseDecisionBody(body);
  if (!parsed) {
    return err("INVALID_REQUEST", "request_id is required.", 400);
  }

  // 4. Delegate the atomic decision to the trusted RPC (service role only).
  const { data, error } = await supabase.rpc("teacher_decide_request", {
    p_request_id: parsed.request_id,
    p_decision: DECISION,
    p_teacher_id: user.id
  });

  if (error) {
    const mapped = mapDecisionError(
      (error as { message?: string }).message ?? ""
    );
    return err(mapped.code, mapped.message, mapped.status);
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | Parameters<typeof mapRpcDecision>[0]
    | undefined;
  if (!row) {
    return err("INTERNAL_ERROR", "Decision returned no result.", 500);
  }

  const outcome = mapRpcDecision(row, DECISION);
  if (outcome.ok) {
    return json(outcome.body, outcome.status, origin);
  }
  return err(outcome.code, outcome.message, outcome.status);
});
