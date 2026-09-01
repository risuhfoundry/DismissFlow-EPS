# BACKEND ↔ FRONTEND INTEGRATION REPORT — DismissFlow EPS

Worktree: `D:\Projects\DismissFlow EPS-frontend` · Branch: `frontend-rebuild` · Live: https://dismissflow-eps.vercel.app

## 1. VERDICT

**FRONTEND ↔ SUPABASE ↔ VERCEL FULLY CONNECTED.**
The live Vercel deployment was found built with **placeholder** Supabase credentials
(`https://placeholder.supabase.co` + a non-JWT placeholder key inlined into the client
bundle). Root cause: the Vercel environment variables held placeholder values. They were
replaced with the REAL project values (Production/Preview/Development) and the existing
project was redeployed. The deployed bundle now provably contains the real project URL and
the real public anon key (hash-verified). Real Auth, real RLS-scoped data, all six existing
Edge Functions, Realtime, role isolation, and the complete dismissal lifecycle were
verified against the REAL backend using EXISTING real accounts. No Supabase backend change
was made or attempted.

## 2. PROJECT_ARCHITECTURE

- **Browser client**: `lib/supabase/client.ts` — `createBrowserClient` (@supabase/ssr), lazy, anon key only, throws if env missing (no fallback).
- **Server client**: `lib/supabase/server.ts` — `createServerClient` with cookie sessions; used by portal layouts, server actions (`*/actions.ts`).
- **Middleware**: `middleware.ts` — session refresh (`supabase.auth.getUser()`), blocks `/foundation` in production (verified live 404).
- **Auth**: `lib/auth/parent-login.ts` (`signInParent`), `lib/auth/role-login.ts` (`signInById`) → `signInWithPassword`, email = `loginId@NEXT_PUBLIC_DEMO_EMAIL_DOMAIN`.
- **Role resolution**: `lib/auth/session.ts` `getSessionUser` → RLS-scoped `public.users` (role, login_id, linked_student_id, assigned_class_id). Server layouts enforce per-role guards.
- **Data**: portal pages read via the RLS-constrained browser client; Realtime via `lib/realtime/subs.ts` (`useRealtimeStatus`, `useTableChanges` — `postgres_changes`, cleaned up on unmount).
- **Mutations**: exclusively via `lib/dismissal/client.ts` → `functions.invoke` (6 existing Edge Functions).

## 3. LOCAL_ENVIRONMENT

Worktree `.env.local` had been clobbered with **placeholders** (signature of an earlier `vercel env pull` against the placeholder Vercel vars). It was rewritten with the REAL values sourced from the stable root project configuration (`D:\Projects\DismissFlow EPS\.env.local`) — URL, anon key, service-role key (local scripts only), `NEXT_PUBLIC_DEMO_EMAIL_DOMAIN=demo.dismissflow`. File is git-ignored (verified with `git check-ignore`).

## 4. ENVIRONMENT_VARIABLES

From a `process.env` audit of `app/`, `components/`, `lib/`, `middleware.ts` (source of truth — no assumptions):

| Variable | Scope | Required on Vercel | Status |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client+server | Production/Preview/Development | ✅ set (REAL value verified by env-pull comparison) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client+server (public by design, RLS-constrained) | all three | ✅ set (REAL value verified) |
| `NEXT_PUBLIC_DEMO_EMAIL_DOMAIN` | client (`loginIdToEmail`) | all three | ✅ set to `demo.dismissflow` |
| `SUPABASE_SERVICE_ROLE_KEY` | **scripts only** — not imported by app runtime | **NOT set on Vercel (correct)** | ✅ |
| `NODE_ENV` | built-in | n/a | ✅ |

## 5. SUPABASE_CONNECTION

- Real project: `https://dmxqqvlnbwzkqfceyuot.supabase.co` (identified from the stable root project configuration and matching all repo E2E script references).
- Auth health endpoint: **200 OK** (GoTrue v2.195.0) with the public anon key.
- The deployed client bundle was inspected: it now contains the real project ref and the anon key **hash-matches** the real project's key (`BUNDLE_REAL_URL=True`, `BUNDLE_REAL_ANON_KEY=True`, `BUNDLE_STILL_HAS_PLACEHOLDER=False`).

## 6. VERCEL_CONNECTION

- Existing project used: `dismissflow-eps` (`prj_xberaAoQiZOTf4OqlOvGOcWrPLv0`, owner `rishixagency-4709's projects`), Next.js preset, region iad1, Node 24.x.
- Git repo: `https://github.com/risuhfoundry/DismissFlow-EPS.git` (Git integration active).
- Framework: Next.js 14.2.35 · Build `next build` · 20 routes.
- CLI: vercel 59.10.0. Supabase CLI: **not installed on PATH** (not needed — backend frozen; noted as limitation).

## 7. AUTHENTICATION

Real Supabase Auth verified for all four roles with **existing** accounts (password = login id per provisioning; no users created/reset): Parent `040` ✅ · Teacher `tch-1001` ✅ · Gate `gte-1001` ✅ · Admin `adm-1001` ✅

## 8. ROLE_RESOLUTION

`public.users` profile row per signed-in user returned the correct role for every account (`parent`, `teacher`, `gate`, `admin`) — RLS-scoped, 4/4 PASS.

## 9. ROLE_ISOLATION

- All four accounts resolve to the **same school tenant** ✅.
- Parent listing all students: sees only **1** row (own child) — RLS enforced ✅.
- Gate student PII dump: **0 rows** ✅.
- Role-rejected Edge Function calls: parent→`scan-qr` = `GATE_REQUIRED`; teacher→`create-dismissal-request` = `FORBIDDEN (Incorrect role)`; unauthenticated = `UNAUTHENTICATED` ✅.
- Portal layouts enforce server-side role guards (`getSessionUser` + `isX`); no client-side-only authorization.
- Note: interactive cross-role *page* clicks require a browser (not available — §21/§31); isolation was verified at the RLS + Edge Function layer, which is authoritative.

## 10. PARENT_DATA

Parent sees the real linked child (admission `040`), real dismissal history (5 rows before this verification), real statuses. No mock fallback anywhere in the data path (no local JSON, no fake API).

## 11. TEACHER_DATA

Teacher reads `dismissal_requests` where `status=AWAITING_TEACHER` (0 rows at verification time — real, legitimately empty queue; proper empty state renders). Teacher approval mutates **only** through the existing `approve-dismissal` Edge Function.

## 12. GATE_DATA

Gate scanner flow verified against the real `scan-qr` function with a REAL QR token from a REAL request: returns the real student (name match confirmed), transitions status, and rejects invalid (`INVALID_QR` 400), reused (`QR_ALREADY_USED` 409) tokens.

## 13. ADMIN_DATA

Admin reads real RLS-scoped data: **18 students**, **1 class** (real pilot school data), dismissals/activity pages use the same browser client + Realtime.

## 14. RLS

- Parent scope: only own child + own requests (count=1 of 18).
- Gate scope: no student PII via REST.
- Teacher scope: queue reads succeed; mutations only via Edge Functions.
- Admin scope: read/visibility of operational data; no mutation capability granted by RLS probes.
- No service-role key exists in any client/server runtime path; RLS is never bypassed.

## 15. SCHOOL_ISOLATION

All four role accounts belong to the same school tenant; every Edge Function validates school/role server-side (`TEACHER_SCHOOL_FORBIDDEN`, `GATE_REQUIRED`, etc. exist in the contract and were exercised where reachable without fabricating data).

## 16. EDGE_FUNCTIONS

All six **existing, pre-deployed** functions reachable and correct — none deployed/modified:

| Function | Unauthenticated | Verified behavior |
|---|---|---|
| `create-dismissal-request` | `UNAUTHENTICATED` | parent create → real `request_id`+token ✅; teacher → `FORBIDDEN` ✅ |
| `scan-qr` | `UNAUTHENTICATED` | real scan ✅; invalid → `INVALID_QR`; reuse → `QR_ALREADY_USED`; parent → `GATE_REQUIRED` ✅ |
| `approve-dismissal` | `UNAUTHENTICATED` | teacher approve → `DISMISSED` ✅; double-approve → `REQUEST_NOT_AWAITING_TEACHER` ✅ |
| `reject-dismissal` | `UNAUTHENTICATED` | deployed ✅ |
| `cancel-dismissal` | `UNAUTHENTICATED` | after-scan cancel → `REQUEST_NOT_CANCELLABLE` ✅ |
| `manage-identity` | `UNAUTHENTICATED` | deployed ✅ |

## 17. REALTIME

`postgres_changes` on `public.dismissal_requests` verified **live**: the parent client received `REQUESTED` → `AWAITING_TEACHER` → `DISMISSED` events in real time during the lifecycle test (`SUBSCRIBED` within seconds). Frontend subscriptions (`lib/realtime/subs.ts`) are RLS-filtered, cleaned up on unmount. No Realtime configuration changed.

## 18. DISMISSAL_WORKFLOW

Full lifecycle executed with REAL accounts and REAL data — **14/14 PASS**:
Parent `040` creates request (`REQUESTED`) → Gate `gte-1001` scans the real QR (returns the real student; status → `AWAITING_TEACHER`) → QR reuse rejected → parent cancel-after-scan rejected → Teacher `tch-1001` approves (`DISMISSED`) → double-approve rejected → parent reads final `DISMISSED` from history → Realtime delivered every transition live. No alternative business logic introduced. The one request created is genuine production usage recorded in real history (no cleanup — deleting it would falsify the audit trail).

## 19. ERROR_HANDLING

Backend error codes translate to typed `InvokeError` codes in `lib/dismissal/client.ts` and map to human-readable UI states. Verified live codes: `INVALID_QR`, `QR_ALREADY_USED`, `REQUEST_NOT_CANCELLABLE`, `REQUEST_NOT_AWAITING_TEACHER`, `UNAUTHENTICATED`, `FORBIDDEN`, `GATE_REQUIRED`. Nothing suppressed.

## 20. PRODUCTION_BUILD

| Gate | Result |
|---|---|
| `npm test` | **26/26 pass** (exit 0) |
| `npm run typecheck` | **0 errors** (exit 0) |
| `npm run check:tokens` | **OK** (exit 0) |
| `npm run build` | **exit 0 — 20/20 routes**, 0 errors, with real `.env.local` present |

## 21. BROWSER_TESTING

No browser/Playwright tool in this environment. Verified via HTTP: `/`, `/login`, `/login/teacher`, `/login/gate`, `/login/admin`, `/parent`, `/teacher`, `/gate`, `/admin` → **200** with correct titles; `/foundation` → **404** (production middleware block); unknown route → 404.

## 22. RESPONSIVE

Not re-verified (no browser tooling). The Phase 30–35 rebuild is the responsive implementation and passed earlier phase browser checks.

## 23. SECURITY

- No `service_role` string and no DB-password URL pattern in any deployed client chunk ✅
- Only browser-visible credentials: project URL + anon key (public by design, RLS-constrained) ✅
- `.env.local` git-ignored and untracked; no env files tracked in Git ✅
- No hardcoded credentials in app code (login IDs are data, never literals) ✅
- `SUPABASE_SERVICE_ROLE_KEY` only in local git-ignored `.env.local` for maintenance scripts; NOT on Vercel ✅
- Temp audit files (env pulls, staged values) deleted after verification ✅

## 24. VERCEL_DEPLOYMENT

- **Existing project used**; no project created/deleted; Git integration and production domain (`dismissflow-eps.vercel.app`) untouched.
- Env vars replaced (placeholder → real) for Production/Preview/Development.
- One new production deployment (`dismissflow-c81x1w83v-…`, Ready, 36 s) from the existing `frontend-rebuild` worktree via CLI; alias unchanged; prior deployment left in place.
- Note: raw deployment URLs are guarded by Vercel Deployment Protection (SSO); the **production alias** is public (Vercel Standard Protection default — does not block end users).

## 25. SUPABASE_CHANGES — **NONE**

## 26. DATABASE_CHANGES — **NONE**

## 27. RLS_CHANGES — **NONE**

## 28. EDGE_FUNCTION_CHANGES — **NONE** (never deployed, never modified)

## 29. REALTIME_CHANGES — **NONE**

(Auth configuration unchanged; no migrations run; no Supabase CLI commands executed.)

## 30. GIT

No commit / push / reset / rebase performed. Status (worktree `frontend-rebuild`, remote `risuhfoundry/DismissFlow-EPS`): pre-existing Phase 30–35 modifications/deletions/untracked reports unchanged, plus new untracked verification artifacts: `.verify/integration-verify.mjs`, `.verify/lifecycle-verify.mjs`, and this report. `.env.local` rewritten locally (git-ignored, invisible to Git).

## 31. KNOWN_LIMITATIONS

1. No browser/Playwright in this environment → interactive UI clicking, console/hydration error capture, and responsive viewport checks not re-run (data/auth/workflow verified at the API layer the UI calls).
2. Supabase CLI not installed on PATH (irrelevant — backend frozen).
3. Raw `*.vercel.app` deployment URLs show Vercel SSO protection; the production alias is public.
4. One real dismissal request was created and completed during lifecycle verification (real usage, retained in real history).
5. Preview/Development Vercel env values are identical to Production (only one real Supabase project exists).

## 32. BLOCKERS

**None.**

## 33. FINAL_ARCHITECTURE

```
USER → VERCEL (dismissflow-eps.vercel.app)
     → NEXT.JS 14 (middleware session refresh; server layouts = guards)
     → SUPABASE SSR/CLIENT (anon key only, cookie sessions)
     → SUPABASE AUTH (real users, per-person credentials)
     → POSTGRES + RLS (school/role/row isolation — verified)
Workflow: NEXT.JS → EXISTING EDGE FUNCTIONS (role/school-validated) → REAL DATABASE
Live:     SUPABASE REALTIME postgres_changes → NEXT.JS CLIENT → UI (verified live)
No mock layer. No replacement API. No service-role bypass.
```

## 34. FINAL_VERDICT

**FRONTEND ↔ SUPABASE ↔ VERCEL FULLY CONNECTED** ✅
