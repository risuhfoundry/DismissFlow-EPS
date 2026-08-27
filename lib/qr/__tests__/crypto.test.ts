// Security tests for DismissFlow EPS secure QR token generation.
//
// These tests import the EXACT module used by the create-dismissal-request Edge
// Function (supabase/functions/create-dismissal-request/crypto.ts), so they
// verify the real production code, not a copy. Run with:
//   npm test   (node --experimental-strip-types)
//
// Coverage maps to Phase 3 STEP 23 (QR Security Tests) items 1–4, 6:
//   1. token generated server-side (here: CSPRNG, never client-controlled)
//   2. token is unpredictable
//   3. plaintext token is not what we persist (we persist only the hash)
//   4. token_hash exists / is deterministic SHA-256
//   6. QR contains only the token (no PII mixed into the token source)

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateSecureToken, sha256Hex } from "../../../supabase/functions/create-dismissal-request/crypto.ts";

const BASE64URL = /^[A-Za-z0-9_-]+$/;

describe("DismissFlow secure QR token", () => {
  test("token is 256-bit entropy (32 bytes => 43-char base64url)", () => {
    const t = generateSecureToken();
    assert.equal(t.length, 43, "32 random bytes encode to 43 base64url chars");
    assert.match(t, BASE64URL, "token is URL-safe (no +, /, or = padding)");
  });

  test("token is unpredictable — two generations never collide", () => {
    const a = generateSecureToken();
    const b = generateSecureToken();
    assert.notEqual(a, b);
  });

  test("SHA-256 hash is deterministic and differs from the plaintext", async () => {
    const t = generateSecureToken();
    const h1 = await sha256Hex(t);
    const h2 = await sha256Hex(t);
    assert.equal(h1, h2, "hash is deterministic for the same input");
    assert.notEqual(h1, t, "plaintext token is never the stored value");
    assert.match(h1, /^[0-9a-f]{64}$/, "hash is a 64-char lowercase hex SHA-256");
  });

  test("distinct tokens produce distinct hashes (no collision in hash space)", async () => {
    const h1 = await sha256Hex(generateSecureToken());
    const h2 = await sha256Hex(generateSecureToken());
    assert.notEqual(h1, h2);
  });

  test("token source contains no PII — it is only the random string", () => {
    // The QR payload is exclusively this token. Confirm it carries no
    // student/guardian markers that could leak into a photographed QR.
    const t = generateSecureToken();
    assert.equal(typeof t, "string");
    assert.ok(t.length > 0);
    assert.doesNotMatch(t, /[A-Za-z]+(040|041)/, "no admission-number leakage");
    assert.doesNotMatch(t, /@/, "no email leakage");
    assert.doesNotMatch(t, /\+/, "base64url, not raw base64");
  });
});
