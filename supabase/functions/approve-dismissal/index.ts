// DismissFlow EPS — approve-dismissal Edge Function (authoritative, Phase 5).
//
// Docs/architecture.md §11.3, Phase 5 STEP 8.
//
// TRUST BOUNDARY: trusted Supabase Edge Function runtime. It is the ONLY place
// that authenticates the caller and enforces role = teacher. The Teacher client
// sends ONLY { request_id }; everything else (teacher identity, role, assigned
// class, student, current status, approved_by, timestamps) is derived server-side.
// The service-role key is used ONLY here (never in the browser) to bypass RLS and
// to call the trusted teacher_decide_request() RPC.
//
// The actual decision workflow (role+class+status validation, atomic state
// transition, atomic audit) lives inside the teacher_decide_request() RPC
// (supabase/migrations/0007_teacher_decision.sql) so it is atomic and cannot be
// invoked directly by a client (EXECUTE is granted to service_role only).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  parseDecisionBody,
  mapRpcDecision,
  mapDecisionError,
  json,
  errorResponse
} from "../_shared/decision-contract.ts";

const DECISION = "DISMISSED" as const;

function err(code: string, message: string, status: number): Response {
  return errorResponse(code, message, status);
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return err("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
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

  // 2. Resolve application profile + enforce role = teacher. Non-teacher roles
  //    (parent / gate / admin) are rejected with 403 TEACHER_REQUIRED.
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

  // 3. Parse the ONLY trusted client input: the request reference. Extra fields
  //    are ignored by parseDecisionBody (we never trust them).
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

  // 4. Delegate the atomic decision to the trusted RPC (service role only). The
  //    teacher identity passed is the auth.uid()-derived id; the RPC re-derives
  //    role + class scope from public.users and never accepts an actor from the
  //    client.
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

  // rpc() with a TABLE-returning function yields an array; take the single row.
  const row = (Array.isArray(data) ? data[0] : data) as
    | Parameters<typeof mapRpcDecision>[0]
    | undefined;
  if (!row) {
    return err("INTERNAL_ERROR", "Decision returned no result.", 500);
  }

  const outcome = mapRpcDecision(row, DECISION);
  if (outcome.ok) {
    return json(outcome.body, outcome.status);
  }
  return err(outcome.code, outcome.message, outcome.status);
});
