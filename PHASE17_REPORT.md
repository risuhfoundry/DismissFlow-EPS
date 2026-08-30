# PHASE 17 — REAL PRODUCTION ARCHITECTURE IMPLEMENTATION

> Scope: Actually implement the Phase 16 blockers — multi-school/tenant model, per-person
> staff identity (no shared accounts), and a real identity lifecycle — while preserving the
> existing server-authoritative security architecture and the NON-NEGOTIABLE ID=password
> authentication model. Working tree only; no commit, no push, no history rewrite.
> Generated: 2026-08-30.

---

## 1. EXECUTIVE VERDICT

**PASS (with documented limitations).** All three Phase 16 blockers are ACTUALLY IMPLEMENTED on
the live project:

1. **Multi-school / tenant model** — a `schools` table plus a `school_id` FK on every
   tenant-owned table; tenant scoping enforced in RLS and in every server-authoritative RPC.
2. **Per-person staff identity** — every teacher, gate, and admin now has their own
   Supabase Auth account + `public.users` row keyed by their own ID. The old shared
   `teacher@` / `gate@` / `admin@` demo accounts are gone.
3. **Real identity lifecycle** — a deployed `manage-identity` Edge Function lets an admin
   create / reset / activate / deactivate / link / unlink / assign / unassign identities,
   all confined to the admin's own school.

**Authentication model is preserved EXACTLY** (Parent ID = Admission No., password = Admission
No.; Teacher ID = Staff ID, password = Staff ID; Gate ID = Gate ID, password = Gate ID; Admin
ID = Admin ID, password = Admin ID). No email/password, OTP, magic link, Google, or random
password replaced it. The visible credential remains a per-person ID + that same ID as password;
the Supabase Auth email is a derived, non-human-visible mapping (`${login_id}@${DOMAIN}`).

**Server-authoritative security is preserved.** The browser still chooses nothing: role,
school, student, teacher, gate, admin identity, and authorization state are all derived
server-side. No plaintext passwords are stored in public tables; no passwords are logged or
exposed through APIs/Realtime; the service-role key is never shipped to the browser.

Three honest gaps are recorded below (Reaper scheduling needs pg_cron; legacy Phase 10–13
scripts still reference the now-deleted shared emails; cross-school error codes were missing
from the client contracts and were fixed this phase). None of them unblocks Phase 18 — they are
tracked as risks/decisions, per the STOP conditions.

---

## 2. PHASE 16 BLOCKERS

| # | Blocker (Phase 16) | Status | Evidence |
|---|---|---|---|
| B1 | Multi-tenant / multi-school data model | **DONE** | `schools` table + `school_id` FK on 7 tables (0015); tenant-scoped RLS (0017/0017b); server-derived school in RPCs (0016) |
| B2 | Per-person staff identity (no shared accounts) | **DONE** | `manage-identity` lifecycle; shared `teacher@`/`gate@`/`admin@` removed; per-person `TCH-1001`/`GTE-1001`/`ADM-1001` verified live |
| B3 | Real identity lifecycle (create/reset/deactivate/link…) | **DONE** | `manage-identity` Edge Function deployed `verify_jwt=true`; full lifecycle verified live (34/34) |

All three are implemented and live-verified. No blocker remains unresolved.

---

## 3. AUTHENTICATION

**Model — UNCHANGED and preserved exactly.**

| Role | Login ID | Password |
|---|---|---|
| Parent | Admission Number | Admission Number |
| Teacher | Staff ID | Staff ID |
| Gate | Gate ID | Gate ID |
| Admin | Admin ID | Admin ID |

- The values `040`, `teacher01`, `gate01`, `admin01` are **examples only** and are NOT
  hardcoded anywhere. Login IDs are data (seeded rows / admin-created rows), never literals.
- **Supabase Auth mapping (implementation detail, not a product change):** each per-person
  identity maps to an Auth user whose email is `loginIdToEmail(login_id)` =
  `${login_id}@${DOMAIN}`, where `DOMAIN = NEXT_PUBLIC_DEMO_EMAIL_DOMAIN` (default
  `demo.dismissflow`). The Auth *password* is set to `login_id` on create/reset so the visible
  credential (ID + same ID) is what the human types. `lib/auth/role-login.ts` and the
  `manage-identity` Edge Function compute this mapping with the SAME formula — verified to match
  exactly. The email is a backend routing key, never shown to or typed by the user.
- This preserves the product requirement: the human authenticates with their own per-person ID
  and that same ID as the password. Email/password, OTP, magic links, Google, and random
  passwords were NOT introduced.
- Login is `(role, login_id)` with **no school qualifier**. `login_id` is globally unique
  (`users_login_id_key` unique index WHERE `login_id IS NOT NULL`), so a given ID resolves to
  exactly one identity/project-wide. (See §24 for the cross-school admission-number decision.)

---

## 4. SCHOOL/TENANT ARCHITECTURE

- `schools` table created (0015) with `school_id` PK (uuid), `name`, `created_at`,
  `updated_at`; an `updated_at` trigger maintains `updated_at`.
- `school_id` FK added (nullable→backfilled→kept nullable where appropriate) to:
  `users`, `students`, `classes`, `guardians`, `dismissal_requests`, `dismissal_events`,
  `student_guardians`.
- **Backfill:** all pre-existing rows were assigned to a single pilot school **"Tulip School"**
  (`school_id = 03560957-7f8b-49b6-b5ac-39c01164fac8`) so the live dataset stays coherent.
- A second school (**"Rose School"**) was created transiently during live verification to prove
  cross-tenant isolation, then deleted by the verification cleanup.
- `public.app_school_id()` (SECURITY DEFINER, `set search_path = public`) returns the caller's
  school from `public.users` — the single source of tenant truth for RLS and RPCs.
- Every server-authoritative RPC now derives the caller's `school_id` server-side and rejects
  cross-school operations with explicit `*_SCHOOL_FORBIDDEN` codes (0016).

---

## 5. PER-PERSON STAFF IDENTITY

- Each teacher/gate/admin is a distinct Supabase Auth user + `public.users` row. No shared
  accounts remain. Verified live: `TCH-1001`, `GTE-1001`, `ADM-1001` each sign in independently
  with their own ID as password.
- Parents are per-person by definition (one `public.users` row per `linked_student_id`, ID =
  admission number).
- `login_id` global uniqueness prevents two people from claiming the same ID; `manage-identity`
  returns `LOGIN_ID_TAKEN` on collision.
- Authorization (role, school, linked student, assigned class) is **never** sent by the client —
  it is read from `public.users` inside SECURITY DEFINER RPCs and from the JWT in Edge Functions.

---

## 6. IDENTITY LIFECYCLE

Deployed `supabase/functions/manage-identity/index.ts` (`verify_jwt=true`), callable only by an
admin. Actions:

| Action | Effect | Verification |
|---|---|---|
| `create` | Insert `public.users` row (role-scoped) + Auth user (email=`loginIdToEmail`, pw=`login_id`); link student (parent) / assign class (teacher). Returns one-time `plaintext_password = login_id`. | live PASS |
| `reset` | Reset Auth password to `login_id`; returns one-time `plaintext_password`. | live PASS |
| `activate` / `deactivate` | Flip `credential_status`; deactivate also `auth.admin.updateUserById({ ban: "banned" })` so sign-in fails with **"User is banned"**. | live PASS (deactivate→ban→sign-in rejected; activate→sign-in restored) |
| `link` / `unlink` | Parent ↔ student (`student_guardians`). | live PASS |
| `assign` / `unassign` | Teacher ↔ class (`assigned_class_id`). | live PASS |

- **School confinement:** the function reads `target.school_id` and compares to the admin's own
  `app_school_id()`; on mismatch it returns `SCHOOL_FORBIDDEN` (verified live: a Tulip admin
  cannot manage a Rose identity).
- **One-time password exposure:** the plaintext password is returned in the Edge Function
  response payload only, exactly once, and never persisted or logged. The UI surfaces it as a
  one-time alert (`Alert tone="warn"` in `app/admin/users/page.tsx`).

---

## 7. RLS / AUTHORIZATION

- **0017 (tenant-scoped RLS rewrite):** every tenant table policy now requires
  `school_id = public.app_school_id()`. Policies cover parent (own linked student),
  teacher (own assigned class), gate (own school scan rows), and admin (own school, read-only).
- **0017b (admin request read scoped):** `dr_admin_select` was rewritten to SELECT-only AND
  school-scoped. This **closes a pre-existing tenant hole** — the prior admin policy allowed
  reading dismissal_requests across all schools. Now Tulip admins cannot see Rose requests
  (verified live: Rose users/requests are invisible to a Tulip admin).
- RPCs remain locked to `service_role` execution (re-applied in 0016) so clients cannot invoke
  them directly with elevated effect; they are only reached through the JWT-authenticated Edge
  Functions, which forward the caller's session.
- **Browser chooses nothing:** role/school/student/teacher/gate/admin identity and authorization
  are all derived server-side; RLS + SECURITY DEFINER RPCs are the enforcement, not the client.

---

## 8. WORKFLOW

State machine (unchanged, now tenant-aware):

```
REQUESTED ──consume_qr_scan──▶ AWAITING_TEACHER ──teacher_decide_request──▶ DISMISSED | REJECTED
   │                                                                 ◀── parent_cancel_request ── CANCELLED
   └── (no scan within 3 min) ── reap_expired_requests ──▶ EXPIRED
```

- All three RPCs (0016) derive caller `school_id` server-side and write `school_id` into
  `dismissal_events`.
- **One-active-request invariant** preserved: partial unique index on `(student_id)` WHERE
  `status IN ('REQUESTED','AWAITING_TEACHER')` blocks a second concurrent request (this caused
  the run-1 test artifact and is correct behavior).
- Cross-school attempts rejected: `GATE_SCHOOL_FORBIDDEN` (scan), `TEACHER_SCHOOL_FORBIDDEN` /
  `PARENT_SCHOOL_FORBIDDEN` (decide/cancel).

---

## 9. QR SECURITY

- Token = 32 CSPRNG bytes → base64url. The **SHA-256 hash** (`token_hash`) is stored; the
  plaintext is returned to the parent exactly once and never stored.
- Single-use: a consumed token maps to `QR_ALREADY_USED` (409).
- Short-lived: 3-minute expiry → `QR_EXPIRED` (410).
- Server-validated only: the gate sends `{ token }`; `student_id` / `request_id` / `role` /
  `status` / `scanned_by` are NEVER trusted from the client (scan-contract + RPC).
- `consume_qr_scan` writes the AWAITING_TEACHER event server-side with the gate's derived
  `school_id`.

---

## 10. REALTIME

- Realtime remains on `dismissal_requests` / `dismissal_events`. Tenant isolation is enforced by
  the same RLS policies (§7): a subscriber only receives rows whose `school_id` matches their
  identity, because Supabase Realtime honors RLS. No client-supplied channel/school parameter is
  honored.
- No Realtime subscription exposes passwords, tokens, or authorization state.

---

## 11. QR EXPIRY / REAPER

- `reap_expired_requests() SECURITY DEFINER` (0016) flips REQUESTED/AWAITING_TEACHER requests
  whose QR is past the 3-minute window to `EXPIRED` and records the transition.
- Verified live: a freshly created, un-scanned request flipped to `EXPIRED` after the reaper ran.
- **Scheduling gap (see §23/§24):** `pg_cron` is **NOT installed** on this project. The reaper
  is therefore exposed as an on-demand function (callable from an Edge Function / script) but has
  no automatic schedule. Expiry is eventually consistent until a scheduler is enabled.

---

## 12. DEMO ASSUMPTIONS

- The pilot data lives under "Tulip School". Example login IDs shown in UI copy
  (`040`, `teacher01`, `gate01`, `admin01`) are **examples only** and are not compiled or
  hardcoded values.
- The Auth email domain defaults to `demo.dismissflow` via `NEXT_PUBLIC_DEMO_EMAIL_DOMAIN`; it is
  a routing key, not a product-facing credential.
- `manage-identity` returns a one-time plaintext password = `login_id`; this is by design (the
  product requires ID == password) and is shown exactly once in the admin UI, never persisted.
- Verification created transient "Rose School" + Rose identities solely to prove cross-tenant
  isolation; all were deleted by the cleanup harness. No real pilot data was deleted.

---

## 13. TEST SCRIPT HARDENING

This phase hardened the verification/regression scripts so they exercise the per-person model
instead of the removed shared accounts, and fixed a false positive:

- **`scripts/phase14-privesc-test.mjs`** — fixed a false positive in the bypass confirmation:
  the `out.some(l => l.startsWith("PASS-PROOF A"))` check also matched the unrelated audit line
  `A: client status flip created NO audit event`. Bypass labels renamed to `A-BYPASS:` /
  `B-BYPASS:` (audit/revert to `A-AUDIT:` / `B-REVERT:`) and the final check now matches only
  `A-BYPASS` / `B-BYPASS`. Parent login is now env-parameterized (`E2E_PARENT_LOGIN`).
- **`scripts/phase14-live-smoke.mjs`** — credentials env-parameterized; gate/teacher redirected
  to the real per-person accounts (`gte-1001@`/`tch-1001@`, passwords `GTE-1001`/`TCH-1001`)
  since `gate@`/`teacher@` no longer exist. Parent login env-parameterized.
- **Legacy Phase 10–13 scripts** (`e2e-phase10`, `e2e-phase13`, `real-time-phase11`,
  `security-phase10/12/13`) — the literal `E2eTest123!` password was replaced with
  `process.env.E2E_STAFF_PASSWORD ?? "E2eTest123!"`. **Limitation:** these scripts still
  reference the OLD shared emails (`admin@`/`teacher@`/`gate@`) which were removed in Phase 17;
  only the password was parameterized per the explicit instruction. They will not run against the
  live project until repointed — tracked in §24.
- **Unit tests:** `npm test` (26 tests across `crypto.test`, `scan.test`, `decision.test`) pass;
  `tsc --noEmit` clean; `next build` succeeds (16 routes). The `decision.test`/`scan.test`
  contracts now assert the new `*_SCHOOL_FORBIDDEN` → 403 mappings.

---

## 14. MIGRATION PROVENANCE

| Migration | Applied? | How | Notes |
|---|---|---|---|
| 0013 expire_request_on_expired_qr | yes (prior phase, untracked) | apply_migration | QR expiry window |
| 0014 fix_scan_class_join | yes (prior phase, untracked) | apply_migration | scan→class join fix |
| 0015 school_tenant_model | yes | apply_migration | schools + FKs + backfill + `app_school_id()` |
| 0016 tenant_rpcs_and_reaper | yes | apply_migration | tenant-aware RPCs + `reap_expired_requests()` + RPC lockdown |
| 0017 tenant_scoped_rls | yes | apply_migration | tenant-scoped RLS |
| 0017b admin_request_select_scoped | yes | apply_migration | closes admin cross-school read hole |

All applied to the **remote** project. `list_migrations` / `get_advisors` confirmed no broken
state. None of the migrations are destructive to real data (backfill only; FKs nullable-friendly).

---

## 15. SECURITY FINDINGS

1. **(FIXED this phase) Cross-school error codes missing from client contracts.** Before the fix,
   `scan-contract.ts` / `decision-contract.ts` had no `GATE_SCHOOL_FORBIDDEN` /
   `TEACHER_SCHOOL_FORBIDDEN` / `PARENT_SCHOOL_FORBIDDEN` mappings, so a correct server-side 403
   collapsed into a generic `INTERNAL_ERROR` (500) at the gate/teacher UI. Added the mappings so
   the UI shows a precise 403 ("This request belongs to another school.") and the request never
   leaks cross-tenant. Edge Functions re-deployed `verify_jwt=true`.
2. **(FIXED this phase) Admin cross-school read hole.** `dr_admin_select` was tenant-unscoped;
   0017b makes it SELECT-only + school-scoped (verified: Tulip admin cannot see Rose rows).
3. **(RESIDUAL) Reaper scheduling.** No `pg_cron`; expiry is on-demand until scheduled (§11/§24).
4. **(RESIDUAL) Legacy scripts use deleted shared emails.** Tracked §13/§24.
5. **No plaintext passwords in public tables; no password logging; service-role key browser-free
   — all preserved.** Confirmed by code review of `manage-identity`, `create-dismissal-request`,
   and the RLS/RPC layer.

---

## 16. TEST MATRIX

| Suite | Result | Notes |
|---|---|---|
| Unit: `crypto.test` / `scan.test` / `decision.test` (26 tests) | **26/26 PASS** | incl. new `*_SCHOOL_FORBIDDEN` → 403 |
| `tsc --noEmit` | **clean** | |
| `next build` | **success** (16 routes) | |
| Live verification `_verify_phase17.mjs` | **34/34 PASS** | see §17 (run from prior session after contract fixes + redeploys; functions unchanged since) |
| `phase14-privesc-test.mjs` (false-positive fixed) | hardened | proves client write-bypass is blocked by RLS/RPC envelope |
| `phase14-live-smoke.mjs` (repointed) | hardened | per-person gate/teacher |

---

## 17. LIVE VERIFICATION

`scripts/_verify_phase17.mjs` executed against the live project (prior session, after the
contract corrections and Edge Function redeploys; the functions and migrations are unchanged
since, so the result stands): **34/34 PASS.**

Coverage:
- **A. Per-person login** — `TCH-1001` / `GTE-1001` / `ADM-1001` sign in independently.
- **B. Lifecycle** — create parent/teacher, reset, deactivate→sign-in fails ("User is banned"),
  activate, assign/unassign class, link/unlink student; cross-school `SCHOOL_FORBIDDEN`.
- **C. Full flow** — parent create → gate scan → teacher approve; asserts `school_id` written on
  both `dismissal_requests` and `dismissal_events`.
- **D. Cross-school** — Rose gate scans Rose QR (positive); Tulip gate scans a fresh un-scanned
  Rose QR → `GATE_SCHOOL_FORBIDDEN`; Tulip teacher decides Rose request →
  `TEACHER_SCHOOL_FORBIDDEN`; RLS hides Rose users from Tulip admin.
- **E. Reaper** — `reap_expired_requests()` flips an expired un-scanned request to `EXPIRED`.
- **Cleanup** — all transient test rows (auth users cascade, students, classes, schools,
  requests) removed; no real pilot data touched.

This turn additionally re-confirmed `npm test`, `tsc --noEmit`, and `next build`, and hardened
the legacy Phase 14 scripts (§13). The live verification itself was not re-run this turn.

---

## 18. FILES CHANGED

Modified (working tree, not committed):
- `app/admin/users/page.tsx`, `app/admin/{classes,logs,monitor,roster}/page.tsx`,
  `app/login/page.tsx`, `app/login/[role]/page.tsx`, `app/teacher/page.tsx`
- `lib/auth/role-login.ts`, `lib/auth/parent-login.ts`, `lib/dismissal/client.ts`
- `supabase/functions/_shared/scan-contract.ts`, `supabase/functions/_shared/decision-contract.ts`
- `supabase/functions/create-dismissal-request/index.ts`
- `scripts/phase14-privesc-test.mjs`, `scripts/phase14-live-smoke.mjs`,
  `scripts/e2e-phase10.mjs`, `scripts/e2e-phase13.mjs`, `scripts/real-time-phase11.mjs`,
  `scripts/security-phase10.mjs`, `scripts/security-phase12.mjs`, `scripts/security-phase13.mjs`
- `.gitignore`

Added (untracked):
- `supabase/functions/manage-identity/index.ts` (deployed)
- `supabase/migrations/0015_*.sql`, `0016_*.sql`, `0017_*.sql`, `0017b_*.sql`
- `scripts/_verify_phase17.mjs`, `scripts/_cleanup_verify.mjs`,
  `scripts/provision-per-person-staff.mjs`
- `components/ui/Select.tsx`
- `PHASE16_REPORT.md` (prior phase artifact)

---

## 19. MIGRATIONS

- Applied: **0015, 0016, 0017, 0017b** (this phase); 0013/0014 carried from prior phase.
- All via `apply_migration` to the remote project; verified applied and advisory-clean.
- Non-destructive: backfill-only, nullable-friendly FKs, added (not dropped) columns/policies.

---

## 20. LIVE DATABASE CHANGES

- New `schools` table; `school_id` FK on 7 tenant tables; Tulip School backfill.
- Globally-unique `login_id` index (`WHERE login_id IS NOT NULL`).
- `public.app_school_id()` SECURITY DEFINER helper.
- RPC rewrites (0016): server-derived school, `*_SCHOOL_FORBIDDEN` rejections, `school_id`
  written to `dismissal_events`, RPC→`service_role` lockdown re-applied.
- `reap_expired_requests()` SECURITY DEFINER.
- RLS rewrite (0017/0017b): tenant-scoped policies; admin read now SELECT-only + school-scoped.
- Per-person Auth users + `public.users` rows for pilot staff (TCH-1001/GTE-1001/ADM-1001…).

---

## 21. DEPLOYMENT CHANGES

- **Edge Functions deployed via MCP `deploy_edge_function` (`verify_jwt=true`):**
  `manage-identity`, `create-dismissal-request`, `scan-qr`, `approve-dismissal`,
  `reject-dismissal`, `cancel-dismissal`. Shared `_shared/scan-contract.ts`,
  `_shared/decision-contract.ts`, and `create-dismissal-request/crypto.ts` deployed alongside
  their dependents.
- No infra change. `pg_cron` remains uninstalled (reaper is on-demand).
- Frontend builds and typechecks clean; no new environment variables required beyond the existing
  `NEXT_PUBLIC_DEMO_EMAIL_DOMAIN` (optional, defaults to `demo.dismissflow`).

---

## 22. REMAINING BLOCKERS

**None.** All Phase 16 blockers (B1–B3, §2) are implemented and live-verified. Phase 18 is not
started (per the STOP condition).

---

## 23. REMAINING RISKS

1. **Reaper not scheduled.** Without `pg_cron`, expired un-scanned requests are only flipped when
   `reap_expired_requests()` is invoked on-demand. Expiry is eventually-consistent, not real-time.
2. **Legacy Phase 10–13 scripts stale.** They still reference the deleted shared
   `admin@`/`teacher@`/`gate@` emails; only the password was parameterized. They will fail live
   until repointed or retired.
3. **Re-verification not re-run this turn.** The 34/34 live result is from the prior session after
   the contract fixes/redeploys; this turn re-confirmed build/test/typecheck and hardened legacy
   scripts. The live functions/migrations are unchanged, so the result is still representative.
4. **Global `login_id` uniqueness.** Admission numbers cannot repeat across schools (by design of
   the unique index). If two real schools legitimately reuse admission numbers, a product decision
   is required (§24).

---

## 24. ARCHITECTURAL DECISIONS REQUIRED

1. **Reaper scheduling:** enable `pg_cron` and schedule `reap_expired_requests()`, or drive it from
   an external cron / Supabase scheduled function? (Currently on-demand only.)
2. **Cross-school admission numbers:** should `login_id` (incl. parent admission_no) stay
   project-wide unique, or become `(school_id, login_id)` unique to allow the same admission
   number at two schools? Requires a migration + index change; product call needed.
3. **Legacy scripts:** repoint Phase 10–13 scripts to per-person emails (or retire them) so the
   full regression suite runs against the live per-person model.
4. **Pilot identity source of truth:** confirm whether the seeded pilot IDs (`040`, `teacher01`,
   `gate01`, `admin01`, `TCH-1001`…) are real demo data or placeholders; they must never be
   hardcoded as literals (they are not).

---

## 25. FINAL VERDICT

Phase 17 is **complete and verified**. The three Phase 16 blockers — multi-school/tenant model,
per-person staff identity, and real identity lifecycle — are ACTUALLY IMPLEMENTED on the live
project and confirmed by 34/34 live checks plus a clean build/typecheck and 26/26 unit tests.

- **Authentication model preserved exactly** (ID == password per role). No email/OTP/magic-link/
  Google/random-password substitution. The Auth email is a derived, non-visible routing key.
- **Server-authoritative security preserved.** Browser chooses nothing; RLS + SECURITY DEFINER
  RPCs enforce role/school/student/teacher/gate/admin identity and authorization. No plaintext
  passwords in public tables; no password logging; service-role key never shipped to the browser.
- **Two genuine security gaps found and fixed this phase:** missing cross-school client error
  codes (403 now precise instead of 500) and an admin cross-school read hole (now SELECT-only +
  school-scoped).
- **Working tree only:** no commit, no push, no history rewrite. All changes remain uncommitted.
  Phase 18 was NOT started (STOP condition honored).

**STOP AFTER PHASE 17.**
