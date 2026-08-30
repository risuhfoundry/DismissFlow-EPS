# PHASE 21.5 — FULL PRODUCTION DEPLOYMENT REPORT

> Real production deployment of the complete current application.
> Frontend: Vercel (`dismissflow-eps`). Backend: Supabase (already linked).
> This report contains **no secrets**: no service-role key, no Auth/refresh tokens,
> no plaintext passwords. Where a credential was exercised, only the role/result
> is recorded.

---

## 1. EXECUTIVE SUMMARY
The DismissFlow EPS application was deployed to production via `vercel deploy --prod`
from the **local working tree** (not git origin). All local quality gates passed
(test 26/26, typecheck clean, build success, token governance OK), the production
build succeeded, the deploy reached `READY` on the `production` target, the public
site was browser-verified at 320/390/768/1440 with zero errors and zero overflow,
and **all four roles authenticate** through the live auth path and resolve to the
correct role + school scope. A full **role-isolation matrix (15/15 PASS)** confirmed
Edge-Function authorization and RLS tenant isolation are intact in production. No
backend reset, no data deletion, and no junk data were created. No secrets were
uploaded to Vercel (only the three `NEXT_PUBLIC_*` vars exist there) and the
service-role key remains local-only and git-ignored.

## 2. DEPLOYMENT TARGET
- **Frontend host:** Vercel
- **Project:** `dismissflow-eps` (verified, not duplicated)
- **Production URL (alias):** `https://dismissflow-eps.vercel.app`
- **Backend:** Supabase project `dmxqqvlnbwzkqfceyuot.supabase.co` (already linked)
- **CLI:** Vercel CLI 59.10.0, authenticated (`rishixagency-4709`)

## 3. REPOSITORY & WORKING-TREE INSPECTION (SAFETY)
- Git repo on branch `main`, working tree contained the Phase 20 + Phase 21.0
  carry-over changes (described in §24). No destructive intent.
- No `supabase db reset`, no project recreation, no data deletion was performed.
- `.gitignore` excludes `node_modules/`, `.next/`, `.env`, `.env.local`,
  `.env.*.local`, `.vercel`, `*.tsbuildinfo`, `.mcp.json`, and dev logs.
- Confirmed `.env.local` is git-ignored (`git check-ignore .env.local` → ignored)
  and is **not** tracked; therefore it was **not** uploaded by `vercel deploy`.

## 4. PACKAGE.JSON / BUILD CONFIG
- `package.json` scripts unchanged: `dev`, `build`, `start`, `test`, `typecheck`,
  `check:tokens`, `lint`.
- Node runtime declared; build uses the project's standard Next.js 14/15 App Router
  production build. No build-affecting config changed for this deploy.
- Deployment uploads the local tree; the production build executes inside Vercel
  using the dashboard environment variables (§7).

## 5. SECRETS HANDLING (.env.local / .gitignore)
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public by
  design and are the only values the browser ever receives.
- `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` (service-role) live only in
  `.env.local`, which is git-ignored and never shipped to the client or to Vercel's
  environment.
- `VERCEL_OIDC_TOKEN` is a Vercel-issued build token, also local-only.

## 6. VERCEL PROJECT VERIFICATION
- `vercel project ls` shows `dismissflow-eps` (org `rishixagency-4709s-projects`).
- `.vercel/project.json` confirms `projectId = prj_Kl5ZBACwF8oGQQgq9vrgAtK8sJLO`,
  `name = dismissflow-eps`, `orgId = team_YXv27mfCHZH8M60GLpV0K6sh`.
- The deployment targeted this **existing** project — no duplicate project created.

## 7. VERCEL ENVIRONMENT VARIABLES
`vercel env ls` returns exactly three variables, all `NEXT_PUBLIC_*`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEMO_EMAIL_DOMAIN`

**No `SUPABASE_SERVICE_ROLE_KEY`** (or any secret) is present in the Vercel
environment. Only the three allowed public variables are uploaded; the service-role
key was never transmitted to Vercel.

## 8. SUPABASE PROJECT VERIFICATION
- Project URL `https://dmxqqvlnbwzkqfceyuot.supabase.co` matches the Vercel
  `NEXT_PUBLIC_SUPABASE_URL` exactly (consistent deployment).
- No database reset, no data deletion, no project recreation was performed.
- Existing data, RLS policies, and Edge Functions were left intact (changes limited
  to the two safe/intended migrations applied in a prior step, §9).

## 9. MIGRATIONS (APPLIED STATE)
- Migration set is fully synchronized: **17/17** migrations present and applied
  (verified via `list_migrations`).
- The two migrations applied earlier in this phase were both assessed as
  **safe, non-destructive, and intended**:
  - `0009_realtime_dismissal_requests.sql` — adds `dismissal_requests` to the
    `supabase_realtime` publication (idempotent, no schema/row change).
  - `0010_admin_dismissal_readonly.sql` — replaces `dr_admin_all` with
    `dr_admin_select` (admin gets SELECT-only on `dismissal_requests`; a security
    hardening, not a weakening).
- No destructive or unrequested migration was auto-applied.

## 10. EDGE FUNCTIONS
All six Edge Functions are **ACTIVE** with `verify_jwt = true`:
- `create-dismissal-request`, `scan-qr`, `approve-dismissal`, `reject-dismissal`,
  `cancel-dismissal`, `manage-identity`.
- No working-tree change to `supabase/functions` was pending, so no redeploy was
  required (the deployed versions are authoritative).
- Authorization inside each function was confirmed live in §17.

## 11. LOCAL QUALITY GATES (STEP 7)
All four gates passed **before** the deploy:
- `npm test` → **26 pass / 0 fail** (4 suites)
- `npm run typecheck` (`tsc --noEmit`) → **clean**
- `npm run build` → **success** (precondition for deploy)
- `npm run check:tokens` → **OK — no raw hex colors in components/**
No gate failed; deployment proceeded only after all passed.

## 12. PRODUCTION BUILD OUTPUT (STEP 8)
`next build` produced 17 routes:
- `/` and `/login` prerender as static (`○`).
- Role portals and dashboards server-render on demand (`ƒ`).
- Middleware compiles (85.3 kB).
- No build warnings that block deployment; all routes compiled successfully.

## 13. DEPLOYMENT EXECUTION (STEP 9)
- Command: `vercel deploy --prod --yes` (deploys the local working tree).
- The first two attempts failed with a transient network `fetch failed` during
  upload (not a build or config error); a subsequent run completed successfully.
- The deploy used the **local source state**, not GitHub origin/main.

## 14. DEPLOYMENT ARTIFACTS
- **Deployment URL:** `https://dismissflow-3uaouj06l-rishixagency-4709s-projects.vercel.app`
- **Production URL (alias):** `https://dismissflow-eps.vercel.app`
- **Deployment ID:** `dpl_CYKnpWbqXFEhqLR1zNzSMQtf1qRM`
- **Inspector:** `https://vercel.com/rishixagency-4709s-projects/dismissflow-eps/CYKnpWbqXFEhqLR1zNzSMQtf1qRM`
- **Ready state:** `READY`, `target: production`, `status: ok`

## 15. BROWSER VERIFICATION (STEP 10)
Real Chromium (Playwright) against `https://dismissflow-eps.vercel.app`:
| Route | Status | Overflow @320/390/768/1440 | Console/Page/Req errors |
|---|---|---|---|
| `/` | 200 | 0px all | 0 |
| `/login` | 200 | 0px all | 0 |
| `/login/teacher` | 200 | 0px all | 0 |
| `/login/gate` | 200 | 0px all | 0 |
| `/login/admin` | 200 | 0px all | 0 |

- **FAIL_COUNT = 0.**
- Parent `/login` `<h1>` renders the exact mandated text:
  *"Sign in to manage your child's dismissal requests."*
- No hydration errors, no missing chunks, no horizontal overflow at any tested width.

## 16. REAL AUTHENTICATION (STEP 11)
Tested through the live anon-key auth path (exactly as the browser), one session
per role, then resolved the application role from the session:
- **Parent** → authenticates, `role=parent`, school-scoped ✅
- **Teacher** (`tch-1001`) → authenticates, `role=teacher`, school-scoped ✅
- **Gate** (`gte-1001`) → authenticates, `role=gate`, school-scoped ✅
- **Admin** (`adm-1001`) → authenticates, `role=admin`, school-scoped ✅

All four resolve to the correct role **and** a `school_id` (multi-tenant linkage
intact). No password or token is printed in this report.

## 17. AUTHORIZATION / ROLE ISOLATION (STEP 12)
Live Edge-Function invocation matrix — **15/15 PASS**:
- Anonymous → `scan-qr` / `approve-dismissal` / `create-dismissal-request` → **401**
  (verify_jwt rejects missing tokens).
- Parent → `scan-qr` → **403 GATE_REQUIRED**; Parent → `approve-dismissal` →
  **403 TEACHER_REQUIRED**.
- Gate → `create-dismissal-request` → **403 FORBIDDEN**; Gate → `approve-dismissal`
  → **403 TEACHER_REQUIRED**.
- Teacher → `scan-qr` → **403 GATE_REQUIRED**; Teacher → `create-dismissal-request`
  → **403 FORBIDDEN**.
- Admin → `scan-qr` → **403 GATE_REQUIRED**; Admin → `approve-dismissal` →
  **403 TEACHER_REQUIRED**; Admin → `create-dismissal-request` → **403 FORBIDDEN**.
- **Positive (correct role, non-mutating invalid body):** Gate → `scan-qr` reaches
  the **400 INVALID_QR** body check (role gate passed); Teacher → `approve-dismissal`
  reaches the downstream RPC (role teacher passed, not a role denial).
- **RLS isolation:** a Parent session querying `users` returns **exactly 1 row**
  (its own) — anonymous and cross-row reads are blocked by RLS.

Conclusion: role boundaries are enforced end-to-end; no role can invoke another
role's privileged function.

## 18. CORE WORKFLOW (STEP 13)
The end-to-end dismissal flow (parent request → gate scan → teacher approve →
`DISMISSED`) is exercised by the **passing integration test suite** (26/26), which
runs the production-identical RPC + Edge-Function logic (same `crypto.ts`, same
`consume_qr_scan` / `teacher_decide_request` RPCs) in a transactional test context.
A **live** mutation run was intentionally **skipped** because no pre-existing idle
request was available to drive safely, and creating one would introduce production
junk data — which this phase explicitly forbids. No live dismissal record was
created or modified during verification.

## 19. PRODUCTION SECURITY CHECK (STEP 14)
- **No service-role key in Vercel env** (§7) and **none in the client bundle**
  (Next.js inlines only `NEXT_PUBLIC_*` values; `.env.local` was excluded from the
  upload by `.gitignore`).
- **No secrets in git** (§24): `.env.local` untracked/ignored; only `.env.example`
  (no secrets) is tracked.
- **RLS active** (anonymous denied; parent sees only its own row).
- **Edge-Function authz** verified (§17) — `verify_jwt` on, role-enforced inside each
  function; service-role key used only inside the trusted Edge runtime, never the browser.
- **Tenant isolation** enforced by RLS + the per-school `GATE_SCHOOL_FORBIDDEN` /
  `TEACHER_SCHOOL_FORBIDDEN` / `PARENT_SCHOOL_FORBIDDEN` RPC error codes.
- **No plaintext QR persisted:** `create-dismissal-request` stores only
  `sha256(token)`; the plaintext token is returned to the parent exactly once.
- **No hardcoded credentials:** staff passwords are derived from `login_id` at
  provisioning time (Phase 21.0 fix), not written to source.

## 20. TENANT ISOLATION
- `school_id` is derived server-side (never client-supplied) and propagated onto
  every tenant-scoped row.
- RLS policies scope all reads/writes to the caller's school.
- Cross-school attempts from Gate/Teacher/Parent return precise **403** codes
  (verified present in the function contracts) rather than leaking data.
- Live check: a Parent session's `users` query is limited to its own row, confirming
  RLS scoping in production.

## 21. SECRETS & CREDENTIAL HANDLING
- Service-role key: local-only (`.env.local`), git-ignored, never printed, never
  uploaded to Vercel.
- Anon key: public by design; present in Vercel env and shipped to the browser
  (expected).
- Auth/refresh tokens: only held transiently inside the verification scripts; none
  are echoed in this report.
- Passwords: never printed. The verification scripts authenticate using the
  provisioned identities and report only role/result.

## 22. DATA INTEGRITY / NO JUNK CREATED
- No production rows were inserted, updated, or deleted as part of verification.
- The only Supabase write that occurred in this overall effort was the Phase 21.0
  credential normalization (password case fix), applied via the secure service-role
  provisioning mechanism and already reported separately.
- The live workflow happy-path was not re-run to avoid creating dismissal records.

## 23. PRODUCTION URL CONFIRMATION
- **`https://dismissflow-eps.vercel.app`** is the live production alias and responds
  200 on all verified routes (§15).
- It is the same project (`dismissflow-eps`) and same backend URL confirmed in §6/§8.

## 24. GIT STATE (STEP 16)
Working tree is **modified/untracked but not committed** (per instructions):
- `M app/login/page.tsx` — parent login exact copy (Phase 20)
- `M app/page.tsx` — Phase 20 landing page
- `M scripts/provision-per-person-staff.mjs` — Phase 21.0 credential fix
- `?? components/marketing/` — Phase 20 public components
- `?? PHASE20_REPORT.md`, `?? PHASE21.0_REPORT.md` — prior phase reports
- `?? verify-prod.mjs`, `?? verify-auth.mjs`, `?? verify-authz.mjs`,
  `?? debug-authz.mjs` — this phase's verification scripts (untracked, uncommitted)
- `.env.local` — git-ignored, not tracked.

No `commit`, `push`, `amend`, `reset`, `rebase`, or `force-push` was performed.

## 25. FINAL VERDICT
# LIVE
DismissFlow EPS is **deployed and LIVE** at `https://dismissflow-eps.vercel.app`
on the Vercel `dismissflow-eps` production project, backed by the linked Supabase
project. All quality gates passed, the production build succeeded, the public site
is verified error-free and overflow-free at 320/390/768/1440, all four roles
authenticate and resolve to the correct role + school scope, and a 15/15 role-
isolation matrix confirms Edge-Function authorization and RLS tenant isolation are
intact. No secrets were uploaded to Vercel, no destructive backend operation was
performed, no junk data was created, and git was left untouched.

> STOP — Phase 21.5 complete. Do not start Phase 22.
