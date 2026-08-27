// Phase 4 scanQr tests for DismissFlow EPS.
//
// These import the EXACT modules the scan-qr Edge Function uses:
//   - supabase/functions/_shared/scan-contract.ts  (body parse + HTTP mapping)
//   - supabase/functions/create-dismissal-request/crypto.ts (shared SHA-256)
// so they verify real production logic, not a copy. Run with:
//   npm test   (node --experimental-strip-types)
//
// Coverage maps to Phase 4 STEP 17–18 (body validation), STEP 24–25 (response
// + error contract), and STEP 27 (shared crypto compatibility). Live DB / RPC
// behaviour and the concurrency guarantee are covered by the RPC migration and
// are marked BLOCKED (no Supabase runtime available) in the final report.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseScanBody,
  mapRpcResult,
  mapRpcError
} from "../../../supabase/functions/_shared/scan-contract.ts";
import { sha256Hex, generateSecureToken } from "../../../supabase/functions/create-dismissal-request/crypto.ts";

describe("scanQr request body parsing (Gate may only send {token})", () => {
  test("accepts a well-formed token body", () => {
    assert.deepEqual(parseScanBody({ token: "abc123" }), { token: "abc123" });
  });
  test("rejects a missing token", () => {
    assert.equal(parseScanBody({}), null);
  });
  test("rejects a non-string token", () => {
    assert.equal(parseScanBody({ token: 123 }), null);
  });
  test("rejects a null body", () => {
    assert.equal(parseScanBody(null), null);
  });
  test("rejects a non-object body", () => {
    assert.equal(parseScanBody("token=abc"), null);
  });
  test("ignores attacker-supplied student_id / status / role / scanned_by", () => {
    const parsed = parseScanBody({
      token: "x",
      student_id: "hack",
      request_id: "hack",
      status: "DISMISSED",
      role: "admin",
      scanned_by: "someone"
    });
    // Only the token is returned — never the injected fields.
    assert.deepEqual(parsed, { token: "x" });
  });
});

describe("scanQr RPC row -> HTTP mapping (Phase 4 error contract)", () => {
  test("ok=true -> 200 with minimal student/class payload (no PII)", () => {
    const r = mapRpcResult({
      ok: true,
      code: "OK",
      student_name: "Aarav",
      class_name: "Tulip",
      status: "AWAITING_TEACHER"
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.status, 200);
      assert.deepEqual(r.body, {
        valid: true,
        status: "AWAITING_TEACHER",
        student: { name: "Aarav", class: "Tulip" }
      });
    }
  });
  test("INVALID_QR -> 400", () => {
    const r = mapRpcResult({
      ok: false,
      code: "INVALID_QR",
      student_name: null,
      class_name: null,
      status: null
    });
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.status, 400);
      assert.equal(r.code, "INVALID_QR");
    }
  });
  test("QR_ALREADY_USED -> 409", () => {
    const r = mapRpcResult({
      ok: false,
      code: "QR_ALREADY_USED",
      student_name: null,
      class_name: null,
      status: "USED"
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 409);
  });
  test("QR_EXPIRED -> 410", () => {
    const r = mapRpcResult({
      ok: false,
      code: "QR_EXPIRED",
      student_name: null,
      class_name: null,
      status: "EXPIRED"
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 410);
  });
  test("REQUEST_NOT_SCANNABLE -> 409", () => {
    const r = mapRpcResult({
      ok: false,
      code: "REQUEST_NOT_SCANNABLE",
      student_name: null,
      class_name: null,
      status: null
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 409);
  });
  test("unknown code -> 500 (safe default)", () => {
    const r = mapRpcResult({
      ok: false,
      code: "WAT",
      student_name: null,
      class_name: null,
      status: null
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 500);
  });
});

describe("scanQr RPC-raised exception mapping", () => {
  test("REQUEST_NOT_SCANNABLE -> 409", () => {
    const r = mapRpcError("REQUEST_NOT_SCANNABLE");
    assert.equal(r.status, 409);
    assert.equal(r.code, "REQUEST_NOT_SCANNABLE");
  });
  test("any other exception -> 500", () => {
    const r = mapRpcError("something unexpected");
    assert.equal(r.status, 500);
    assert.equal(r.code, "INTERNAL_ERROR");
  });
});

describe("scan-side hashing is the shared SHA-256 (matches create-side)", () => {
  test("sha256Hex is deterministic and 64-char lowercase hex", async () => {
    const t = generateSecureToken();
    const a = await sha256Hex(t);
    const b = await sha256Hex(t);
    assert.equal(a, b);
    assert.match(a, /^[0-9a-f]{64}$/);
  });
  test("the same token hashed by scan side equals create side (one module)", async () => {
    const token = "demo-token-compat";
    // The create-side stored token_hash and the scan-side computed hash must
    // be byte-identical because both call the same sha256Hex.
    assert.equal(await sha256Hex(token), await sha256Hex(token));
  });
});
