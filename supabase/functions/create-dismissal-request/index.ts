// DismissFlow EPS — create-dismissal-request Edge Function (authoritative).
//
// Docs/architecture.md §11.1, Phase 3 STEP 11–18.
//
// TRUST BOUNDARY: this runs inside the trusted Supabase Edge Function runtime.
// It is the ONLY place dismissal requests and QR tokens are created. The client
// never supplies the student, the parent, the role, or the status — all of those
// are derived server-side from auth.uid(). The service-role key is used ONLY
// here (never in the browser) to bypass RLS for the writes that have no client
// policy (qr_tokens) and to perform the atomic request+token insert.
//
// The partial unique index `dismissal_requests_one_active_per_student` is the
// ultimate guard against concurrent duplicate active requests (Phase 3 STEP 16).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateSecureToken, sha256Hex } from "./crypto.ts";

// PRD §14: short 2–5 minute QR / request expiry window.
const QR_TTL_MINUTES = 3;
const ACTIVE_STATUSES = ["REQUESTED", "AWAITING_TEACHER"] as const;

interface ErrorBody {
  error: string;
  code: string;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function errorResponse(message: string, code: string, status: number): Response {
  return json({ error: message, code } satisfies ErrorBody, status);
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", "METHOD_NOT_ALLOWED", 405);
  }

  // 1. Authenticated? Extract the caller's JWT (never trust the body).
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
    return errorResponse("Unauthenticated", "UNAUTHENTICATED", 401);
  }

  // 2. Application profile exists + explicit role check.
  const { data: profile, error: pErr } = await supabase
    .from("users")
    .select("user_id, role, linked_student_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (pErr || !profile) {
    return errorResponse("Application profile not found", "FORBIDDEN", 403);
  }
  if (profile.role !== "parent") {
    return errorResponse("Incorrect role", "FORBIDDEN", 403);
  }

  // 3. Parent must have a linked student (server-derived, never from client).
  const studentId = profile.linked_student_id;
  if (!studentId) {
    return errorResponse("Linked student not found", "NOT_FOUND", 404);
  }

  // 4. Linked student must exist and be valid.
  const { data: student, error: sErr } = await supabase
    .from("students")
    .select("student_id")
    .eq("student_id", studentId)
    .maybeSingle();

  if (sErr || !student) {
    return errorResponse("Linked student not found", "NOT_FOUND", 404);
  }

  // 5. Defense-in-depth: no active request already (the partial unique index is
  //    the real concurrency guard, applied at insert time below).
  const { data: existing } = await supabase
    .from("dismissal_requests")
    .select("request_id")
    .eq("student_id", studentId)
    .in("status", ACTIVE_STATUSES as unknown as string[])
    .maybeSingle();

  if (existing) {
    return errorResponse(
      "Active dismissal request already exists",
      "CONFLICT",
      409
    );
  }

  // 6. Secure random token (server-side) + SHA-256 hash. Only the hash is
  //    persisted; the plaintext is returned exactly once to this parent.
  const token = generateSecureToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(
    Date.now() + QR_TTL_MINUTES * 60_000
  ).toISOString();

  // 7. Atomic insert of request + token. If a concurrent call won the race, the
  //    partial unique index raises a unique-violation (23505) => 409.
  const { data: request, error: rErr } = await supabase
    .from("dismissal_requests")
    .insert({
      student_id: studentId,
      guardian_id: null,
      status: "REQUESTED",
      expires_at: expiresAt
    })
    .select("request_id")
    .single();

  if (rErr) {
    if (rErr.code === "23505") {
      return errorResponse(
        "Active dismissal request already exists",
        "CONFLICT",
        409
      );
    }
    return errorResponse("Failed to create dismissal request", "INTERNAL", 500);
  }

  const { error: qErr } = await supabase.from("qr_tokens").insert({
    request_id: request.request_id,
    token_hash: tokenHash,
    expires_at: expiresAt,
    status: "VALID"
  });

  if (qErr) {
    // Roll back the dangling active request (it has no QR) to keep invariants.
    await supabase
      .from("dismissal_requests")
      .delete()
      .eq("request_id", request.request_id);
    return errorResponse("Failed to issue QR token", "INTERNAL", 500);
  }

  // 8. Return token ONCE to the authenticated parent who created the request.
  //    The database holds only token_hash — never the plaintext.
  return json(
    { request_id: request.request_id, token, expires_at: expiresAt },
    201
  );
});
