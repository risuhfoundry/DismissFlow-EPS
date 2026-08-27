// Shared, framework-free helpers for the approve-dismissal / reject-dismissal Edge
// Functions.
//
// IMPORTANT: this module is imported by BOTH
//   - supabase/functions/approve-dismissal/index.ts   (Deno Edge Function runtime)
//   - supabase/functions/reject-dismissal/index.ts    (Deno Edge Function runtime)
//   - lib/teacher/__tests__/decision.test.ts           (Node 22 test runner)
// so it uses ONLY standard TypeScript / Web-platform constructs and never
// references a Deno- or Node-specific module. That lets the SAME logic be unit
// tested in Node and executed in production.
//
// Source of truth: Docs/architecture.md §11.3/§11.4, §14; Phase 5 error contract.

// -----------------------------------------------------------------------------
// HTTP envelope helpers. We use the structured { error: { code, message } }
// envelope (matching the scan-qr Edge Function) so clients get a machine-readable
// code they can branch on.
// -----------------------------------------------------------------------------
export function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

export function errorResponse(
  code: string,
  message: string,
  status: number
): Response {
  return json({ error: { code, message } }, status);
}

// -----------------------------------------------------------------------------
// Teacher decision request body. The Teacher may ONLY send { request_id }. Any
// other field is ignored (we NEVER trust student_id / teacher_id / class_id /
// role / status / approved_by / rejected_by from the client — Phase 5 rule).
// Returns null for an unsafe body.
// -----------------------------------------------------------------------------
export function parseDecisionBody(input: unknown): { request_id: string } | null {
  if (typeof input !== "object" || input === null) return null;
  const body = input as Record<string, unknown>;
  const requestId = body["request_id"];
  if (typeof requestId !== "string" || requestId.length === 0) return null;
  return { request_id: requestId };
}

// -----------------------------------------------------------------------------
// Response contracts. `ok` narrows the union for the caller.
// -----------------------------------------------------------------------------
export type Decision = "DISMISSED" | "REJECTED" | "CANCELLED";

export interface DecisionSuccess {
  ok: true;
  status: 200;
  body: {
    success: true;
    status: Decision;
    request_id: string;
    student_id: string;
  };
}

export interface DecisionFailure {
  ok: false;
  status: number;
  code: string;
  message: string;
}

export type DecisionOutcome = DecisionSuccess | DecisionFailure;

// Row shape returned by the teacher_decide_request RPC (always exactly one row).
export interface DecisionRpcRow {
  ok: boolean;
  code: string;
  request_id: string | null;
  student_id: string | null;
  status: string | null;
}

// Map the RPC's returned row to an HTTP outcome (Phase 5 + Phase 6 contract):
//   200 success + minimal {request_id, student_id}
//   | 400 INVALID_DECISION
//   | 403 TEACHER_REQUIRED
//   | 403 TEACHER_CLASS_FORBIDDEN
//   | 404 REQUEST_NOT_FOUND
//   | 409 REQUEST_NOT_AWAITING_TEACHER
//   | 500 otherwise.
//
// Phase 6 extends the same mapping to the parent cancel flow. The cancel RPC
// uses {PARENT_REQUIRED, PARENT_STUDENT_FORBIDDEN, REQUEST_NOT_CANCELLABLE} as
// the failure codes; the decision parameter is then "CANCELLED" rather than
// "DISMISSED" / "REJECTED". We detect the cancel codes from the row and map
// them to the right HTTP status.
export function mapRpcDecision(
  row: DecisionRpcRow,
  decision: Decision
): DecisionOutcome {
  if (row.ok) {
    return {
      ok: true,
      status: 200,
      body: {
        success: true,
        status: decision,
        request_id: row.request_id ?? "",
        student_id: row.student_id ?? ""
      }
    };
  }
  switch (row.code) {
    case "INVALID_DECISION":
      return {
        ok: false,
        status: 400,
        code: "INVALID_DECISION",
        message: "Invalid decision."
      };
    case "TEACHER_REQUIRED":
      return {
        ok: false,
        status: 403,
        code: "TEACHER_REQUIRED",
        message: "Teacher role required."
      };
    case "TEACHER_CLASS_FORBIDDEN":
      return {
        ok: false,
        status: 403,
        code: "TEACHER_CLASS_FORBIDDEN",
        message: "You are not authorized for this class."
      };
    case "REQUEST_NOT_FOUND":
      return {
        ok: false,
        status: 404,
        code: "REQUEST_NOT_FOUND",
        message: "Request not found."
      };
    case "REQUEST_NOT_AWAITING_TEACHER":
      return {
        ok: false,
        status: 409,
        code: "REQUEST_NOT_AWAITING_TEACHER",
        message: "This request is not awaiting a teacher decision."
      };
    case "PARENT_REQUIRED":
      return {
        ok: false,
        status: 403,
        code: "PARENT_REQUIRED",
        message: "Parent role required."
      };
    case "PARENT_STUDENT_FORBIDDEN":
      return {
        ok: false,
        status: 403,
        code: "PARENT_STUDENT_FORBIDDEN",
        message: "You are not authorized for this student."
      };
    case "REQUEST_NOT_CANCELLABLE":
      return {
        ok: false,
        status: 409,
        code: "REQUEST_NOT_CANCELLABLE",
        message: "This request can no longer be cancelled."
      };
    default:
      return {
        ok: false,
        status: 500,
        code: "INTERNAL_ERROR",
        message: "Unexpected decision result."
      };
  }
}

// Map an RPC-RAISED exception (if any) to an HTTP outcome. Our RPC returns rows
// rather than raising, so this is a defensive fallback for genuine DB errors.
export function mapDecisionError(message: string): DecisionFailure {
  switch (message) {
    case "TEACHER_REQUIRED":
      return { ok: false, status: 403, code: "TEACHER_REQUIRED", message: "Teacher role required." };
    case "TEACHER_CLASS_FORBIDDEN":
      return { ok: false, status: 403, code: "TEACHER_CLASS_FORBIDDEN", message: "You are not authorized for this class." };
    case "REQUEST_NOT_FOUND":
      return { ok: false, status: 404, code: "REQUEST_NOT_FOUND", message: "Request not found." };
    case "REQUEST_NOT_AWAITING_TEACHER":
      return { ok: false, status: 409, code: "REQUEST_NOT_AWAITING_TEACHER", message: "This request is not awaiting a teacher decision." };
    case "PARENT_REQUIRED":
      return { ok: false, status: 403, code: "PARENT_REQUIRED", message: "Parent role required." };
    case "PARENT_STUDENT_FORBIDDEN":
      return { ok: false, status: 403, code: "PARENT_STUDENT_FORBIDDEN", message: "You are not authorized for this student." };
    case "REQUEST_NOT_CANCELLABLE":
      return { ok: false, status: 409, code: "REQUEST_NOT_CANCELLABLE", message: "This request can no longer be cancelled." };
    default:
      return { ok: false, status: 500, code: "INTERNAL_ERROR", message: "Decision failed." };
  }
}
