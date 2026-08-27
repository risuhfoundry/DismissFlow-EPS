// Phase 5 Teacher decision tests for DismissFlow EPS.
//
// These import the EXACT module the approve-dismissal / reject-dismissal Edge
// Functions use:
//   - supabase/functions/_shared/decision-contract.ts (body parse + HTTP mapping)
// so they verify real production logic, not a copy. Run with:
//   npm test   (node --experimental-strip-types)
//
// Coverage maps to Phase 5 STEP 11 (error contract), STEP 13/14 (audit/immutable
// shaping), and the no-client-authority rule (body parsing ignores injections).
// Live DB / RPC behaviour, concurrency guarantee, and RLS are covered by the
// migration and live-runtime verification, and are reported there.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseDecisionBody,
  mapRpcDecision,
  mapDecisionError
} from "../../../supabase/functions/_shared/decision-contract.ts";

describe("teacher decision request body parsing (Teacher may only send {request_id})", () => {
  test("accepts a well-formed request_id body", () => {
    assert.deepEqual(parseDecisionBody({ request_id: "abc-123" }), {
      request_id: "abc-123"
    });
  });
  test("rejects a missing request_id", () => {
    assert.equal(parseDecisionBody({}), null);
  });
  test("rejects a non-string request_id", () => {
    assert.equal(parseDecisionBody({ request_id: 123 }), null);
  });
  test("rejects an empty request_id", () => {
    assert.equal(parseDecisionBody({ request_id: "" }), null);
  });
  test("rejects a null body", () => {
    assert.equal(parseDecisionBody(null), null);
  });
  test("rejects a non-object body", () => {
    assert.equal(parseDecisionBody("request_id=abc"), null);
  });
  test("ignores attacker-supplied status / teacher / class / student / approved_by", () => {
    const parsed = parseDecisionBody({
      request_id: "real-id",
      status: "DISMISSED",
      teacher_id: "hack",
      class_id: "hack",
      student_id: "hack",
      approved_by: "hack",
      rejected_by: "hack"
    });
    // Only the request_id is returned — never the injected authority fields.
    assert.deepEqual(parsed, { request_id: "real-id" });
  });
});

describe("parent cancel RPC row -> HTTP mapping (Phase 6 cancel codes)", () => {
  test("ok=true (CANCELLED) -> 200 with CANCELLED status", () => {
    const r = mapRpcDecision(
      {
        ok: true,
        code: "OK",
        request_id: "req-c1",
        student_id: "stu-c1",
        status: "CANCELLED"
      },
      "CANCELLED"
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.status, 200);
      assert.equal(r.body.status, "CANCELLED");
    }
  });
  test("PARENT_REQUIRED -> 403", () => {
    const r = mapRpcDecision(
      {
        ok: false,
        code: "PARENT_REQUIRED",
        request_id: null,
        student_id: null,
        status: null
      },
      "CANCELLED"
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.status, 403);
      assert.equal(r.code, "PARENT_REQUIRED");
    }
  });
  test("PARENT_STUDENT_FORBIDDEN -> 403", () => {
    const r = mapRpcDecision(
      {
        ok: false,
        code: "PARENT_STUDENT_FORBIDDEN",
        request_id: "req-c3",
        student_id: "stu-other",
        status: "REQUESTED"
      },
      "CANCELLED"
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.status, 403);
      assert.equal(r.code, "PARENT_STUDENT_FORBIDDEN");
    }
  });
  test("REQUEST_NOT_CANCELLABLE -> 409", () => {
    const r = mapRpcDecision(
      {
        ok: false,
        code: "REQUEST_NOT_CANCELLABLE",
        request_id: "req-c4",
        student_id: "stu-c4",
        status: "AWAITING_TEACHER"
      },
      "CANCELLED"
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.status, 409);
      assert.equal(r.code, "REQUEST_NOT_CANCELLABLE");
    }
  });
  test("cancel exception mapping: REQUEST_NOT_CANCELLABLE -> 409", () => {
    const r = mapDecisionError("REQUEST_NOT_CANCELLABLE");
    assert.equal(r.status, 409);
    assert.equal(r.code, "REQUEST_NOT_CANCELLABLE");
  });
  test("cancel exception mapping: PARENT_STUDENT_FORBIDDEN -> 403", () => {
    const r = mapDecisionError("PARENT_STUDENT_FORBIDDEN");
    assert.equal(r.status, 403);
    assert.equal(r.code, "PARENT_STUDENT_FORBIDDEN");
  });
});

describe("teacher decision RPC row -> HTTP mapping (Phase 5 error contract)", () => {
  test("ok=true -> 200 with minimal {request_id, student_id, status}", () => {
    const r = mapRpcDecision(
      {
        ok: true,
        code: "OK",
        request_id: "req-1",
        student_id: "stu-1",
        status: "DISMISSED"
      },
      "DISMISSED"
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.status, 200);
      assert.deepEqual(r.body, {
        success: true,
        status: "DISMISSED",
        request_id: "req-1",
        student_id: "stu-1"
      });
    }
  });
  test("ok=true (REJECTED) -> 200 with REJECTED status", () => {
    const r = mapRpcDecision(
      {
        ok: true,
        code: "OK",
        request_id: "req-2",
        student_id: "stu-2",
        status: "REJECTED"
      },
      "REJECTED"
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.body.status, "REJECTED");
  });
  test("TEACHER_REQUIRED -> 403", () => {
    const r = mapRpcDecision(
      {
        ok: false,
        code: "TEACHER_REQUIRED",
        request_id: null,
        student_id: null,
        status: null
      },
      "DISMISSED"
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.status, 403);
      assert.equal(r.code, "TEACHER_REQUIRED");
    }
  });
  test("TEACHER_CLASS_FORBIDDEN -> 403", () => {
    const r = mapRpcDecision(
      {
        ok: false,
        code: "TEACHER_CLASS_FORBIDDEN",
        request_id: "req-3",
        student_id: "stu-3",
        status: "AWAITING_TEACHER"
      },
      "DISMISSED"
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 403);
  });
  test("REQUEST_NOT_FOUND -> 404", () => {
    const r = mapRpcDecision(
      {
        ok: false,
        code: "REQUEST_NOT_FOUND",
        request_id: "req-4",
        student_id: null,
        status: null
      },
      "DISMISSED"
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.status, 404);
      assert.equal(r.code, "REQUEST_NOT_FOUND");
    }
  });
  test("REQUEST_NOT_AWAITING_TEACHER -> 409", () => {
    const r = mapRpcDecision(
      {
        ok: false,
        code: "REQUEST_NOT_AWAITING_TEACHER",
        request_id: "req-5",
        student_id: "stu-5",
        status: "DISMISSED"
      },
      "REJECTED"
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.status, 409);
      assert.equal(r.code, "REQUEST_NOT_AWAITING_TEACHER");
    }
  });
  test("INVALID_DECISION -> 400", () => {
    const r = mapRpcDecision(
      {
        ok: false,
        code: "INVALID_DECISION",
        request_id: null,
        student_id: null,
        status: null
      },
      "DISMISSED"
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 400);
  });
  test("unknown code -> 500 (safe default)", () => {
    const r = mapRpcDecision(
      {
        ok: false,
        code: "WAT",
        request_id: null,
        student_id: null,
        status: null
      },
      "DISMISSED"
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.status, 500);
      assert.equal(r.code, "INTERNAL_ERROR");
    }
  });
});

describe("teacher decision RPC-raised exception mapping (defensive)", () => {
  test("TEACHER_REQUIRED -> 403", () => {
    const r = mapDecisionError("TEACHER_REQUIRED");
    assert.equal(r.status, 403);
    assert.equal(r.code, "TEACHER_REQUIRED");
  });
  test("TEACHER_CLASS_FORBIDDEN -> 403", () => {
    const r = mapDecisionError("TEACHER_CLASS_FORBIDDEN");
    assert.equal(r.status, 403);
  });
  test("REQUEST_NOT_FOUND -> 404", () => {
    const r = mapDecisionError("REQUEST_NOT_FOUND");
    assert.equal(r.status, 404);
  });
  test("REQUEST_NOT_AWAITING_TEACHER -> 409", () => {
    const r = mapDecisionError("REQUEST_NOT_AWAITING_TEACHER");
    assert.equal(r.status, 409);
  });
  test("any other exception -> 500", () => {
    const r = mapDecisionError("something unexpected");
    assert.equal(r.status, 500);
    assert.equal(r.code, "INTERNAL_ERROR");
  });
});
