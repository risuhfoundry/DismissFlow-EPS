# PHASE 16 — PRODUCTION CONVERSION / REAL PRODUCT HARDENING
**Audit date:** 2026-08-30
**Target:** DismissFlow EPS (Next.js 14 App Router + Supabase Auth/Postgres/Edge Functions/Realtime)
**Scope:** Full audit-first review of the security core, identity model, multi-tenancy, RLS, workflow, QR, Edge/RPC, Realtime, audit, reliability, deployment, and demo assumptions. Live verification performed against the deployed Supabase project via read-only MCP inspection and authenticated client tests.
**Effort:** MAX. **Git:** no commit/push/reset/rebase performed. Changes left in working tree per instruction.

---

## 1. EXECUTIVE VERDICT
**CONDITIONAL PASS — NOT PRODUCTION-READY FOR THE STATED MULTI-SCHOOL PRODUCT SCOPE.**

The cryptographic and authorization *core* is genuinely strong and was verified live:
- State-changing authority (QR scan, teacher decision, parent cancel) is **server-only** via `SECURITY DEFINER` RPCs locked to `service_role`. Verified live: `consume_qr_scan`, `teacher_decide_request`, `parent_cancel_request` grant EXECUTE **only** to `postgres`/`service_role`.
- Client write paths are eliminated: `dismissal_requests` is SELECT-only for client roles (0003→0011 removed `dr_parent_own_insert/update` and `users_self_update`). **Live privesc test confirmed a parent client cannot set `status` or escalate `role`** (0 rows affected, no error, no audit event).
- RLS is correct and was verified live (policy inventory matches design; `qr_tokens` has RLS enabled with **zero** policies = deny-all).
- QR tokens are cryptographically sound: 32 CSPRNG bytes, SHA-256 stored, plaintext returned once, single-use, 3-min expiry, server-validated.
- Unit tests 26/26 pass; typecheck clean.

However, the system **does not meet the product's stated real-world requirements** in three areas that are architectural, not bug-level:
1. **No multi-tenancy** (no `school_id`/`tenant` anywhere — verified live and confirmed "Future" in docs).
2. **Shared role accounts** (`teacher@demo.dismissflow`, `gate@…`, `admin@…`) — no per-person staff ID exists in the UI or data model; this both violates the product's "ID = Password" per-person requirement and destroys per-person auditability.
3. **No identity lifecycle UI** (provisioning/linking/assignment/deactivation/rotation only exists as a server-only script).

These are reported as **BLOCKER / ARCHITECTURAL DECISION REQUIRED / PRODUCT REQUIREMENT CONFLICT** and were **not** silently implemented.

---

## 2. BLOCKERS
| # | Blocker | Evidence | Required decision |
|---|---------|----------|------------------|
| B1 | **No multi-tenancy.** Single-school schema. The product brief implies real schools (plural) with tenant isolation. | Live `information_schema.columns`: 0 `school`/`tenant` columns on any table. `Docs/architecture.md` line ~1181 lists multi-school as "Future". | Decide: (a) ship single-school pilot only, or (b) add `school_id` + extend all RLS scopes. Building (b) is a large schema/RLS change — needs your go-ahead, not a silent edit. |
| B2 | **Shared staff accounts** — every teacher logs in as one `teacher@demo.dismissflow`; same for gate/admin. No per-person identifier field is collected or stored (`login_id` is NULL for staff). | `app/login/[role]/page.tsx` renders `{role}@demo.dismissflow` and collects **only a password**. `lib/auth/role-login.ts` `roleEmail(role)` = `${role}@${domain}`, no ID input. Provision script sets `login_id` only for parents. | Decide the per-person staff identity model (e.g., staff ID = password) and how it maps to Supabase Auth. Requires UI + auth + provisioning changes. |
| B3 | **No identity lifecycle management surface.** Admin pages are read-only; there is no UI to create/link/assign/deactivate/rotate credentials. | All 6 admin pages SELECT-only; `credential_status` displayed but not editable. Provisioning exists only in `scripts/provision-demo-identities.mjs` (service-role, server-only). | Decide whether production needs an in-app admin lifecycle console or out-of-band provisioning. |

---

## 3. PRODUCT REQUIREMENT CONFLICTS
| # | Conflict | Detail |
|---|----------|--------|
| P1 | **ID = Password model vs. security reality.** The brief mandates Parent=Admission No, Teacher=Staff ID, Gate=Gate ID, Admin=Admin ID (password == ID). The implementation partially honors this for **parents** (admission number is both ID and password) but for staff it collapses to a **single shared role password** (B2), not per-person IDs. Where implemented (parents), the password equals a publicly-derivable identifier, which is explicitly "not a security control" per `Docs/architecture.md` line ~647. | Reported per instruction — not silently changed. The architecture doc itself plans OTP/passkeys/IdP "for production." |
| P2 | **Per-person staff identity not implemented** despite being a core product requirement. The UI has no field for a teacher/gate/admin ID. | See B2. The brief's examples (teacher01, gate01, admin01) are explicitly "examples only — do NOT hardcode," and they are **not** present in logic; the actual implementation is worse for auditability (one shared account). |
| P3 | **`demo.dismissflow` baked as default domain** in production code paths (`NEXT_PUBLIC_DEMO_EMAIL_DOMAIN ?? "demo.dismissflow"`). | Env-overridable, but the default is a demo value shipped in client code. Acceptable for pilot; must be overridden per deployment. |

---

## 4. AUTH VERDICT
**VERIFIED (strong).**
- Supabase Auth (email/password) is the sole authority. Browser never holds service-role key (verified: `lib/supabase/client.ts` anon-only; `lib/supabase/server.ts` anon-only; service-role used **only** inside Edge Functions / provision script).
- Edge Functions authenticate via `supabase.auth.getUser(jwt)` (not `getSession`), enforce role, and **derive identity server-side** (`profile.linked_student_id`, `assigned_class_id`, `user.id`). Client body is never trusted for student/role/status/actor.
- CORS echoes `Origin`, sets **no** `Access-Control-Allow-Credentials` → JWT remains the sole gate (verified in function source).
- **No plaintext passwords** in public tables, APIs, logs, browser bundle, or Realtime. (`.env.local` holds real anon/service-role/`VERCEL_OIDC_TOKEN` but is gitignored and was never read into the report.)
- Live privesc proof (Phase 14): parent client **cannot** set `dismissal_requests.status` or escalate `users.role` → **EXPLOIT BLOCKED**.
- **Caveat:** the Phase 14 script prints `EXPLOITABLE: YES` as its final line, but that is a **false positive from a string-match bug in the test harness** (`out.some(l => l.startsWith("PASS-PROOF A"))` also matches the unrelated audit-event check). The actual bypass/escalation checks both returned `[NO]`/FAIL-PROOF. The system is **NOT exploitable**.

---

## 5. IDENTITY LIFECYCLE
**NOT VERIFIED / PARTIAL — BLOCKER for real operation (see B3).**
- Parents: provisioned 1:1 from `students` (linked_student_id), password = admission number. Idempotent. Works live (Phase 14 created a request as parent 041).
- Staff (teacher/gate/admin): one account each, password from env or random (printed at provision time). **No `login_id`**, so the admin "LOGIN" column shows `—` for all staff.
- No UI for credential rotation, deactivation (`credential_status` is display-only), re-linking, or class (re)assignment.
- No account lockout / rate limiting on the ID=Password login (see §22).

---

## 6. MULTI-TENANCY
**BLOCKER (B1).** Verified live: no `school_id`/`tenant` column on any of the 8 tables. RLS is single-tenant (scoped by `auth.uid()` → `public.users` row → linked student / assigned class). `Docs/architecture.md` confirms multi-school is a deferred "Future" item. For a single-school pilot this is acceptable; for the stated multi-school product it is a hard blocker requiring a schema + RLS migration that must be explicitly approved.

---

## 7. RLS
**VERIFIED (strong).** Live `pg_policies` inventory:
- `users`: `users_self_read` (SELECT self), `users_admin_all` (ALL, admin). **No `users_self_update`** (escalation path removed — 0011).
- `dismissal_requests`: `dr_parent_own_select`, `dr_teacher_class`, `dr_admin_select` — all SELECT-only. **No insert/update policies for clients.** (0003/0011 removed the write paths.)
- `dismissal_events`: SELECT-only policies per role; **no INSERT/UPDATE/DELETE** → append-only; writes happen only via service-role RPCs.
- `students`/`guardians`/`student_guardians`/`classes`: SELECT scoped (self/linked/class), plus `admin` ALL.
- `qr_tokens`: RLS enabled, **zero policies** → deny-all for every role. Verified: every role reads 0 rows.
- Helpers (`app_role()`, `app_linked_student()`, `app_assigned_class()`) are `SECURITY DEFINER` with `set search_path = public` → no recursive-RLS pitfall.
- **Frontend filtering is never the authorization boundary** — all enforcement is DB-side. (Defense-in-depth note: `teacher/page.tsx` loads `eq("status","AWAITING_TEACHER")` without an explicit class filter, relying on `dr_teacher_class` RLS; this is safe but should be made explicit.)

---

## 8. WORKFLOW
**VERIFIED.**
- States: `REQUESTED → AWAITING_TEACHER` (scan), `→ DISMISSED | REJECTED` (teacher), `REQUESTED → CANCELLED` (parent). `EXPIRED` reachable (0013). `IDLE` unused.
- Transitions are atomic and server-forced inside `SECURITY DEFINER` RPCs with `FOR UPDATE` locks and status guards.
- **One-active-request invariant verified live:** partial unique index `dismissal_requests_one_active_per_student` on `(student_id) WHERE status IN ('REQUESTED','AWAITING_TEACHER')`. Edge Function also pre-checks + handles `23505` → 409.
- Browser cannot choose status/actor/student/class/school — all derived server-side.

---

## 9. QR
**VERIFIED (strong).**
- Generation: `generateSecureToken()` = 32 CSPRNG bytes → base64url; `sha256Hex()` (Web Crypto) stored as `qr_tokens.token_hash`. Plaintext returned **once** (201 response, `Cache-Control: no-store`).
- Single-use: `consume_qr_scan` locks the token `FOR UPDATE`, rejects `USED`, marks `USED` atomically.
- Expiry: 3-minute TTL (`QR_TTL_MINUTES = 3`); expired → `QR_EXPIRED` (410), and (post-0013) the linked request is expired too.
- Replay/guess resistant: 256-bit entropy; lookup is by hash; never PII; never exposed via Realtime; never logged.
- **Residual bug (NOT FIXED):** the 0013 fix only handles *scanned-after-expiry*. A `REQUESTED` request whose QR **ages out un-scanned** stays `REQUESTED` forever and occupies the one-active slot (parent cannot re-request → 23505). Needs a `pg_cron` reaper or client-side allow-recreate. Documented as out-of-scope in 0013.

---

## 10. EDGE/RPC
**VERIFIED.**
- 5 Edge Functions: `create-dismissal-request`, `scan-qr`, `approve-dismissal`, `reject-dismissal`, `cancel-dismissal`. All: verify JWT via `auth.getUser`, enforce role, derive identity server-side, ignore extra body fields (shared `scan-contract.ts`/`decision-contract.ts` parsers), return structured `{error:{code,message}}`.
- 3 authority RPCs locked to `service_role` (verified live grants). `pg_cron`/scheduled jobs: none deployed.
- No service-role key in browser bundle (verified source).

---

## 11. REALTIME
**VERIFIED.**
- Live `pg_publication_tables`: only `dismissal_requests` and `dismissal_events` are published to `supabase_realtime` (0012); `qr_tokens` and `guardians` are **not** (no PII/secret leakage). `REPLICA IDENTITY FULL` confirmed on the two published tables (0009/0012).
- Client subscribes read-only (`useTableChanges`); Realtime is a refresh trigger, not a control path. RLS still filters what each signed-in user receives.

---

## 12. AUDIT / OBSERVABILITY
**VERIFIED (append-only, server-derived).**
- `dismissal_events` is the audit log: `scanned_by`, `approved_by`, `scan_time`, `approval_time`, `final_status`. Writes occur only inside the RPCs (service-role); RLS permits SELECT only → clients cannot forge or alter.
- Live test: a parent client attempting a direct status flip created **no** audit event (RLS denied the write). `scanned_by`/`approved_by` are the server-derived `auth.uid()` values, not client input.
- **Gap:** audit identifiability is weakened by B2 — because all teachers share one `teacher@demo.dismissflow` identity, `approved_by` cannot distinguish *which* teacher acted. This is an auditability defect traceable to the shared-account blocker.

---

## 13. RELIABILITY
**VERIFIED / MINOR GAPS.**
- Atomic transitions, `FOR UPDATE` locks, partial unique index, structured error codes, `Cache-Control: no-store`, idempotent provisioning.
- **Gap (medium):** unscanned-QR-expiry reaper missing (§9) → permanent slot lock for un-scanned requests.
- **Gap (low):** no retry/backoff or idempotency keys on Edge Function calls from the client; transient failures surface as raw errors.
- **Provenance gap (medium):** migrations `0013` and `0014` are **applied to live** (verified via `list_migrations`) but are **untracked in git** (`git status` shows `??`). This breaks migration reproducibility/provenance — they must be committed. (Per git rules I did **not** commit them; recommending you commit in a follow-up.)

---

## 14. DEPLOYMENT
**VERIFIED (build pending).**
- Next.js 14 App Router; Edge Functions (Deno); Supabase project. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `NEXT_PUBLIC_DEMO_EMAIL_DOMAIN` (default `demo.dismissflow`), optional `VERCEL_OIDC_TOKEN`.
- `.gitignore` correctly excludes `.env*`, `.next`, `node_modules`, `.vercel` → secrets not committed (verified: `.env.local` present locally but not in `git status`).
- **Build:** `npm run build` → **PASS (exit 0)**. All 16 routes compiled; `/` and `/login` static, all role portals dynamic (ƒ), middleware 85.2 kB. (Typecheck and 26/26 unit tests also pass.)
- No CI/CD, no IaC, no DB-migration-in-CI step observed. Migrations are applied ad hoc (hence the §13 provenance gap).

---

## 15. DEMO ASSUMPTIONS
- `demo.dismissflow` is the default email domain in client code (env-overridable) — **demo assumption retained**; must be overridden per real deployment (P3).
- Seed data `0006_seed_tulip` loads 18 real-ish Tulip students (names + admission numbers like 040/041/5767) and guardians → **demo/pilot data**, not production student records. Any real deployment must reseed with authorized data.
- Parent password = admission number is a **demo shortcut** explicitly documented as "not a security control" (arch doc). Must be replaced for production (P1).
- `VERCEL_OIDC_TOKEN` in local `.env.local` is owner-scoped — never ship to client; currently gitignored (safe).

---

## 16. SECURITY FINDINGS
| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| S1 | Critical (architectural) | Shared staff accounts destroy per-person identity & auditability | BLOCKER (B2) — decision required |
| S2 | Critical (architectural) | No multi-tenancy for stated multi-school product | BLOCKER (B1) — decision required |
| S3 | High (architectural) | No identity lifecycle UI | BLOCKER (B3) — decision required |
| S4 | High | ID=Password weak model (parent pw = public identifier) | PRODUCT REQUIREMENT CONFLICT (P1) |
| S5 | Medium | Unscanned-QR expiry leaves request permanently `REQUESTED` (slot lock) | NOT FIXED — reaper needed |
| S6 | Medium | Migrations 0013/0014 applied to live but untracked in git | NOT VERIFIED-in-VCS — commit recommended |
| S7 | Medium | No login rate-limiting / account lockout on ID=Password auth | NOT VERIFIED — Supabase Auth abuse protections not confirmed configured |
| S8 | Low | Teacher queue omits explicit class filter (relies on RLS) | VERIFIED safe (defense-in-depth suggestion) |
| S9 | Low | Middleware does no authorization (by design; RLS is the boundary) | VERIFIED by design — note only |
| S10 | Low | Automated E2E/security scripts have stale hardcoded staff passwords → not runnable as-is | NOT VERIFIED via automation — scripts need env-parameterized creds |

**Positive verifications (no finding):** RPC lockdown, RLS correctness, QR crypto, Edge auth/role enforcement, Realtime scope, append-only audit, one-active-request invariant, live privesc blocked.

---

## 17. TEST MATRIX (28 adversarial tests — coverage status)
| Category | Tests | Status |
|----------|-------|--------|
| RLS isolation (qr_tokens 0 for all roles, anon reads nothing) | 13 | **VERIFIED** (live `pg_policies` + Phase-13 design; Phase-13 script not runnable due to S10) |
| Role scoping (parent/teacher/gate/admin) | 6 | **VERIFIED** (live policies) |
| RPC EXECUTE denial (anon/teacher/parent) | 3 | **VERIFIED** (live grants) |
| Edge auth (missing/invalid JWT 401, wrong role 403, authorized reaches 400) | 4 | **VERIFIED** (function source + Phase-13 design) |
| CORS preflight | 2 | **VERIFIED** (function source) |
| QR expiry / replay / single-use / guessing | 5 | **VERIFIED** (source + live function def) |
| Teacher class scoping / cross-tenant isolation | 2 | **VERIFIED** (live `dr_teacher_class`) |
| Parent↔parent isolation | 1 | **VERIFIED** (live `dr_parent_own_select` + Phase-13 design) |
| Privilege escalation (status/role) | 2 | **VERIFIED LIVE** (Phase-14 run: blocked) |
| Audit forgery (client write creates no event) | 1 | **VERIFIED LIVE** (Phase-14 run) |
| Full-chain happy path (create→scan→approve→audit) | 1 | **NOT VERIFIED via automation** (S10 stale creds); chain components individually verified |
| Multi-school / cross-tenant data leakage | 1 | **N/A — feature absent (B1)** |

**Live execution actually performed this session:** `npm test` (26/26 pass), `npm run typecheck` (clean), `node scripts/phase14-privesc-test.mjs` (privesc **blocked**; temp row cancelled via proper cancel flow). `scripts/security-phase13.mjs` and `scripts/phase14-live-smoke.mjs` **failed at staff sign-in** due to stale hardcoded passwords (S10) and were **not** fully executed.

---

## 18. FILES CHANGED
**No source files were modified during the audit.** Working tree at close (`git status --short`):
```
 M .gitignore
 M app/admin/classes/page.tsx
 M app/admin/logs/page.tsx
 M app/admin/monitor/page.tsx
 M app/admin/roster/page.tsx
 M app/admin/users/page.tsx
 M app/login/page.tsx
 M app/teacher/page.tsx
?? supabase/migrations/0013_expire_request_on_expired_qr.sql
?? supabase/migrations/0014_fix_scan_class_join.sql
```
(The `M` files were pre-existing modifications present at session start; not introduced by this audit. The two `??` migrations are applied-to-live but untracked — see S6.)

---

## 19. MIGRATIONS CHANGED
- `0013_expire_request_on_expired_qr.sql` — **applied to live**, **untracked in git**. Fixes Finding 1 (expires linked request on post-expiry scan).
- `0014_fix_scan_class_join.sql` — **applied to live**, **untracked in git**. Fixes Finding 3 (class_name join). Carries forward 0013.
- Both verified present in live `list_migrations` and the live `consume_qr_scan` definition reflects both fixes.

---

## 20. LIVE DB CHANGES
- **None performed by this audit.** All live interaction was read-only (MCP `list_migrations`, `list_tables`, `execute_sql` SELECTs) or via the normal application flows (Phase-14 create + cancel, which are ordinary user operations and were cleaned up). No DDL/DML executed against the database by the auditor.

---

## 21. LIVE DEPLOYMENT CHANGES
- **None.** Edge Functions and migrations were not deployed/redeployed by this audit. The two bug-fix migrations (0013/0014) are already live (applied earlier). Build: **PASS (exit 0)** — 16 routes, no errors.

---

## 22. REMAINING RISKS
- **R1 (High):** Shared staff accounts (B2) make `approved_by`/`scanned_by` non-attributable to a person — audit trail is effectively anonymous for staff actions.
- **R2 (Medium):** Unscanned-QR slot lock (S5) can soft-lock a student's dismissal flow until a reaper/allow-recreate is added.
- **R3 (Medium):** No login rate-limiting/lockout (S7) on an ID=Password scheme → brute-force exposure, especially since parent password == public admission number.
- **R4 (Medium):** Migration provenance gap (S6) — if the project is ever rebuilt from git + migrations, 0013/0014 would be re-applied (idempotent, but the gap indicates ad-hoc DB changes).
- **R5 (Low):** No CI runs typecheck/test/build/migrate on PRs; no IaC.

---

## 23. ARCHITECTURAL DECISIONS REQUIRED
1. **Multi-tenancy:** ship single-school pilot, or implement `school_id` + tenant-scoped RLS across all 8 tables + Edge Functions? (B1)
2. **Per-person staff identity:** adopt Staff ID = Password (per product brief), and how to map N staff members to Supabase Auth (one Auth user per staff ID; current model is one shared Auth user per role). (B2/P2)
3. **Identity lifecycle:** build an in-app admin console for provisioning/linking/assignment/deactivation/rotation, or keep out-of-band scripted provisioning? (B3)
4. **Authentication strength:** keep ID=Password (demo-grade, conflicts with production security), or adopt OTP/passkeys/school-IdP as the arch doc plans? (P1)
5. **QR expiry reaper:** add `pg_cron` job to expire un-scanned `REQUESTED` requests, or allow parent re-request? (S5)
6. **Test credentials:** parameterize `security-phase13.mjs` / `phase14-live-smoke.mjs` from env (like the provision script) so the live adversarial suite is runnable. (S10)

**These were NOT implemented silently.** Each requires product/architecture sign-off.

---

## 24. FINAL VERDICT
**NOT READY for production as a multi-school, per-person-identity product. READY (with caveats) as a single-school pilot.**

- The security *mechanism* layer — RLS, server-only authority RPCs, Edge-Function auth/role enforcement, QR cryptography, append-only audit, one-active-request invariant — is **VERIFIED strong** and resists the adversarial tests attempted (including a live privilege-escalation attempt that was blocked).
- The blockers are **architectural and product-scoped**, not coding bugs: multi-tenancy (B1), shared staff accounts / missing per-person identity (B2), and absent identity-lifecycle UI (B3). These conflict with the stated real-world requirements and were reported, not silently changed.
- Two real medium bugs remain open: unscanned-QR slot lock (S5) and the migration provenance gap (S6). The 0013/0014 bug-fixes are already live but should be committed to git.
- The ID=Password model is reported as a **PRODUCT REQUIREMENT CONFLICT** (P1) per instruction; it is weak by design and the architecture doc itself plans to replace it.

**Recommended next step before any production launch:** obtain decisions on §23 items 1–4 (they are interdependent and shape the schema), then implement multi-tenancy + per-person staff identity + lifecycle UI as a coordinated change set, and wire CI to run typecheck/test/build + apply migrations.

**STOP. PHASE 16 COMPLETE. No PHASE 17 started.**
