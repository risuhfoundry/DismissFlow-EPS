// Shared, framework-free helpers for the scanQr Edge Function.
//
// IMPORTANT: this module is imported by BOTH
//   - supabase/functions/scan-qr/index.ts        (Deno Edge Function runtime)
//   - lib/qr/__tests__/scan.test.ts              (Node 22 test runner)
// so it uses ONLY standard TypeScript / Web-platform constructs and never
// references a Deno- or Node-specific module. That lets the SAME logic be unit
// tested in Node and executed in production.
//
// Source of truth: Docs/architecture.md §11.2, §8.5; Phase 4 STEP 17–18, 24–25.

// -----------------------------------------------------------------------------
// Gate request body. The Gate may ONLY send { token }. Any other field is
// ignored (we NEVER trust student_id / request_id / role / status / scanned_by
// from the client — architecture §8.5, §11.2). Returns null for an unsafe body.
// -----------------------------------------------------------------------------
export function parseScanBody(input: unknown): { token: string } | null {
  if (typeof input !== "object" || input === null) return null;
  const body = input as Record<string, unknown>;
  const token = body["token"];
  if (typeof token !== "string" || token.length === 0) return null;
  return { token };
}

// -----------------------------------------------------------------------------
// Response contracts. `ok` narrows the union for the caller.
// -----------------------------------------------------------------------------
export interface ScanSuccess {
  ok: true;
  status: 200;
  body: {
    valid: true;
    status: "AWAITING_TEACHER";
    student: { name: string; class: string };
  };
}

export interface ScanFailure {
  ok: false;
  status: number;
  code: string;
  message: string;
}

export type ScanOutcome = ScanSuccess | ScanFailure;

// Row shape returned by the consume_qr_scan RPC (always exactly one row).
export interface ScanRpcRow {
  ok: boolean;
  code: string;
  student_name: string | null;
  class_name: string | null;
  status: string | null;
}

// Map the RPC's returned row to an HTTP outcome (architecture §11.2 contract):
//   200 valid + minimal student/class | 400 INVALID_QR | 409 QR_ALREADY_USED
//   | 410 QR_EXPIRED | 409 REQUEST_NOT_SCANNABLE | 500 otherwise.
export function mapRpcResult(row: ScanRpcRow): ScanOutcome {
  if (row.ok) {
    return {
      ok: true,
      status: 200,
      body: {
        valid: true,
        status: "AWAITING_TEACHER",
        student: {
          name: row.student_name ?? "",
          // Expose the section/class name as `class` per the gate payload (PRD §15).
          class: row.class_name ?? ""
        }
      }
    };
  }
  switch (row.code) {
    case "INVALID_QR":
      return { ok: false, status: 400, code: "INVALID_QR", message: "QR code is invalid." };
    case "QR_ALREADY_USED":
      return { ok: false, status: 409, code: "QR_ALREADY_USED", message: "This QR code has already been used." };
    case "QR_EXPIRED":
      return { ok: false, status: 410, code: "QR_EXPIRED", message: "This QR code has expired." };
    case "REQUEST_NOT_SCANNABLE":
      return { ok: false, status: 409, code: "REQUEST_NOT_SCANNABLE", message: "This request is not scannable." };
    default:
      return { ok: false, status: 500, code: "INTERNAL_ERROR", message: "Unexpected scan result." };
  }
}

// Map an RPC-RAISED exception (e.g. REQUEST_NOT_SCANNABLE) to an HTTP outcome.
export function mapRpcError(message: string): ScanFailure {
  if (message === "REQUEST_NOT_SCANNABLE") {
    return { ok: false, status: 409, code: "REQUEST_NOT_SCANNABLE", message: "This request is not scannable." };
  }
  return { ok: false, status: 500, code: "INTERNAL_ERROR", message: "Scan failed." };
}
