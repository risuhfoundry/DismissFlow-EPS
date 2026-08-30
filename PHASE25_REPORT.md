# PHASE 25 — ADMIN APPLICATION (PRODUCTION SCHOOL OPERATIONS)

## 1. VERDICT

**ADMIN APPLICATION READY.**

The Admin application is built on the EXISTING real Supabase backend (the same one
serving the Parent 22, Teacher 23, and Gate 24 applications), at the same production
quality, reusing the Phase 19/21 design system and the Phase 22/23/24 architecture.

- Step 0 (backend inspection) completed first; Admin authorization was derived from
  the backend, never assumed.
- All four quality gates pass: `npm test` (26/26), `npm run typecheck`, `npm run build`,
  `npm run check:tokens`.
- Real-Chromium (Playwright) verification at 320/375/430/768/1024/1440/1920 px:
  15/15 checks pass, **0 horizontal overflow, 0 console errors, 0 page errors,
  0 hydration/missing-chunk errors**.
- Cross-role denial confirmed (gate → `/admin` is blocked with "Administrators only").
- No backend, Supabase, RLS, Edge Function, RPC, schema, seed, or account changes were made.
- Changes are left uncommitted. No deployment.

Scope is honestly **read-only operations & monitoring**: per the migrations, Admin is
RLS-scoped to `SELECT` on the operational tables and is NOT granted mutation power over
dismissal/identity workflows. Identity management and account creation exist only behind
the secure `manage-identity` Edge Function, which returns one-time plaintext passwords —
surfacing those in the browser would violate the password-security rule, so the portal
deliberately does NOT expose identity writes. This is documented in sections 11/12/13/44.

## 2. MISSION

Build the COMPLETE production-quality Admin application ("ADMIN APPLICATION / PRODUCTION
SCHOOL OPERATIONS") on the EXISTING real backend, to the same quality as the completed
Parent/Teacher/Gate applications, reusing the Phase 19/21 design system + Phase 22/23/24
architecture. Inspect the backend FIRST to determine exactly what Admin is authorized to
read/manage; if the backend supports only reads, build read-only; if a secure contract
supports a write, reuse it; if not, do NOT invent a mutation — report the limitation.

Deliverable gates: `npm test`, `npm run typecheck`, `npm run build`, `npm run check:tokens`,
real-Chromium verification at the required widths with 0 overflow / 0 errors, and this
46-section report. STOP after the report — do not start Phase 26.

## 3. ADMIN AUTHENTICATION

- Admin authenticates through the SAME existing per-person staff flow as Teacher/Gate
  (`app/login/[role]/page.tsx` → `AuthShell` → `signInById` in `lib/auth/role-login.ts`).
- Credential = per-person Admin ID + password (pilot: `ADM-1001`, password = the
  lowercased login id, provisioned by `scripts/provision-per-person-staff.mjs`; the
  password is NOT printed, created, or reset by this work).
- `signInById(role, id, password)` calls `supabase.auth.signInWithPassword({ email:
  loginIdToEmail(id), password })`. The email is a deterministic internal artifact
  (`${id.trim().toLowerCase()}@${NEXT_PUBLIC_DEMO_EMAIL_DOMAIN ?? "demo.dismissflow"}`),
  never shown to the user.
- After a successful sign-in, `AuthShell` re-resolves the role server-side via
  `getSessionUser` and signs the session OUT if `role !== "admin"` — the browser never
  asserts a role; it only presents the person's ID + password and lets Supabase Auth +
  `public.users` + RLS derive role/school/links.
- Verified end-to-end in Chromium: `ADM-1001` / `adm-1001` signs in and lands on `/admin`.

## 4. ADMIN IDENTITY

- Identity is resolved by `getSessionUser(supabase)` (`lib/auth/session.ts`): it reads
  `user_id, role, login_id, linked_student_id, assigned_class_id` from `public.users`
  for the authenticated Auth user. It returns **NO `school_id`** — school context is
  resolved separately and server-side.
- `isAdmin(u)` confirms `role === "admin"`.
- The admin layout (`app/admin/layout.tsx`) is a server component that calls
  `getSessionUser` and renders an "Administrators only" card for any non-admin session
  (the same guard pattern as Gate/Teacher). This was verified: a signed-in Gate user
  hitting `/admin` sees "Administrators only".
- The profile page shows the Admin ID (`login_id`), account type "Administrator", and the
  server-resolved school name (fetched via `users.school_id → schools.name`). No Auth
  emails, UUIDs, or service-role data are surfaced.

## 5. SCHOOL/TENANT CONTEXT

- School context is **server-derived only**. The browser never sends, receives, or trusts
  a `school_id` from URL/query/localStorage/client state.
- `app_school_id()` (SECURITY DEFINER) resolves the caller's school from `public.users`.
  Every Admin `SELECT` is governed by RLS policies of the form
  `public.app_role() = 'admin' AND school_id = public.app_school_id()`
  (see `supabase/migrations/0017_tenant_scoped_rls.sql` and
  `0017b_admin_request_select_scoped.sql`).
- The profile page looks up the school name from the admin's own `users.school_id` —
  it does not accept a school identifier from the client.
- Multi-tenant isolation is therefore enforced by RLS, not by frontend filtering.

## 6. OVERVIEW

`app/admin/page.tsx` — "Operations overview". Server-scope head-counts + recent activity:
- School population: Students, Classes, Parents, Teachers, Gate staff (exact `count: exact`
  head queries, RLS-scoped).
- Dismissals: Total requests, Active (REQUESTED+AWAITING_TEACHER), Awaiting teacher,
  Dismissed, Rejected/Cancelled.
- Recent dismissal activity: latest 100 `dismissal_requests` hydrated with student/class
  names; "View all" → `/admin/dismissals`.
- Status mix: per-status tiles from the recent rows.
- Live connection badge (realtime status). Every figure is computed from the database;
  nothing is hardcoded.

## 7. PEOPLE

`app/admin/people/page.tsx` — "People" / "Application accounts". Read-only accounts table:
- Columns: Role (tone-coded badge: admin→primary, teacher→info, gate→warning, parent→neutral),
  Login ID, Linked student (name + ADM), Assigned class, Status (active→success else neutral).
- Reads `users` (user_id, role, login_id, credential_status, linked_student_id,
  assigned_class_id) + students/classes maps. No emails or internal UUIDs are shown.
- Search (login / linked student / admission / class / role) + Role filter + pager (10/page).

## 8. STUDENTS

`app/admin/students/page.tsx` — "Students" / "Roster". Read-only roster:
- Columns: ADM (admission_no), Name, Gender, DOB, Class, Guardian (Linked/None badge).
- Reads `students` (student_id, name, admission_no, gender, dob, class_id) + classes map.
  `student_guardians` is read for presence only (student_id) — no guardian PII is shown.
- Search by name/admission + pager.

## 9. CLASSES

`app/admin/classes/page.tsx` — "Classes" / "Class list". Read-only:
- Stat tiles: Classes, Total students, With teacher.
- Class cards (muted tone) showing teacher login ID + student count.
- Reads `classes` (class_id, class_name, section, teacher_id) + students (counts) +
  users (role=teacher → login map). Search by class/section/teacher.

## 10. DISMISSAL MONITORING

`app/admin/dismissals/page.tsx` — "Dismissals" / "Status summary". Read-only monitor:
- Status summary tiles across all six `DISMISSAL_STATUSES`.
- Requests table: Student (name + ADM + class), Status (badge), Created, Expires.
- Reads latest 100 `dismissal_requests` + students + classes. Search + Status filter +
  pager (12/page). Live badge + realtime re-fetch.
- The portal only OBSERVES state. Every transition is performed by the trusted Edge
  Functions; Admin has no update/delete policy on `dismissal_requests`
  (`0017b_admin_request_select_scoped.sql`: `dr_admin_select` is `FOR SELECT` only).
- No QR tokens, no guardian contact details are shown.

## 11. ADMIN ACTIONS

The Admin portal performs **no state-changing actions** against the operational workflow
tables. There is no "approve / reject / dismiss / reset password" button anywhere in the
Admin UI. This is by design: the migrations grant Admin `SELECT`-only on
`dismissal_requests` and `dismissal_events`, and `public.users`/`students`/`classes`
mutations are reserved for the secure `manage-identity` / provisioning paths (see §12/§44).
The only Admin-initiated action is **sign out** (`app/admin/actions.ts` server action →
`supabase.auth.signOut()` → `redirect("/login/admin")`), verified working.

## 12. IDENTITY MANAGEMENT

A secure identity contract exists: `supabase/functions/manage-identity/index.ts`
(actions: create, reset, activate, deactivate, link, unlink, assign, unassign), enforcing
`target.school_id === caller.school_id` on every mutation. It is the ONLY sanctioned path
for identity writes, and it is invoked server-side with the service role.

However, that function **returns the one-time plaintext password** in its response body on
`create` and `reset`. Per the password-security rule (§13), the portal must never display,
transmit, or log credentials. Exposing those passwords in the browser UI would violate that
rule. Therefore the Admin portal does **NOT** surface an identity-management UI and does
**NOT** call `manage-identity`. Identity provisioning/reset remains a service-role,
out-of-band operation (the existing `scripts/provision-per-person-staff.mjs` pattern).
This is a deliberate, documented scope limitation — see §44.

## 13. PASSWORD SECURITY

- The portal never creates, resets, displays, hashes, stores, logs, or transmits any
  password or credential.
- Login is delegated entirely to Supabase Auth (`signInWithPassword`); the browser only
  forwards the person's ID + password they typed.
- Admin password provisioning/reset is handled by the service-role `manage-identity`
  function / provisioning script, never by frontend code. The Admin UI does not call it
  (see §12).
- No credential appears anywhere in the Admin UI, logs, or network payloads inspected.

## 14. ACTIVITY/AUDIT

`app/admin/activity/page.tsx` — "Activity" / "Dismissal events". Read-only, append-only
audit trail over `dismissal_events`:
- Columns: Student (name + ADM), Outcome (final_status badge or "Open"), Scanned
  (time + operator login), Approved (time + operator login), Recorded.
- Operator UUIDs (`scanned_by`/`approved_by`) are mapped to login IDs via a
  `users` (role in teacher/gate) lookup so **no raw UUIDs are rendered**.
- Reads latest 100 `dismissal_events` + students + operator maps. Search + Outcome filter
  + pager. Live badge + realtime.
- `dismissal_events` has no update/delete RLS policy — rows are written only by the trusted
  Edge Functions via the service role, so the history cannot be altered from the portal.
  No tokens/JWTs are involved.

## 15. REALTIME

Reuses the Phase 22/23/24 realtime architecture:
- `useRealtimeStatus(supabase, table)` renders a Live/Reconnecting/Offline/Connecting badge.
- `useTableChanges<T>(supabase, table, "*", handler)` re-fetches on change — **reflect-only**,
  RLS-filtered (the browser never decides or mutates state).
- Used on Overview (dismissal_requests), Dismissals (dismissal_requests), Activity
  (dismissal_events). Verified the Live badge renders.

## 16. SEARCH

- People: search across login ID / linked student name+ADM / assigned class / role.
- Students: search by name / admission number.
- Dismissals: search by student name / admission number.
- Activity: search by student name / admission number.
- Classes: search by class name / section / teacher login.
All search is client-side filtering over the RLS-scoped result set (server/RLS already
limits visibility to the admin's school); no client-supplied tenant scoping.

## 17. FILTERS

- People: Role `<Select>` (All / Parent / Teacher / Gate / Admin).
- Dismissals: Status `<Select>` (All / each `DISMISSAL_STATUS`).
- Activity: Outcome `<Select>` (All / each `DISMISSAL_STATUS`, plus "Open").
- Classes/Students/Overview: no dropdown filters (search only), which is appropriate to
  their shape.

## 18. PAGINATION

- People: `PAGE_SIZE = 10`, `Pager` component (returns null when a single page).
- Dismissals/Activity: `PAGE_SIZE = 12`.
- Students/Classes: client pager over the scoped set.
- `Pager` is the shared design-system component; page resets to 1 when search/filter changes.

## 19. LOADING STATES

- Overview: skeleton grid of 10 `StatTile` placeholders while the initial `refresh()` runs.
- People/Students/Classes/Dismissals/Activity: `DataTable` shows skeleton rows
  (`loading` prop) until data arrives.
- Profile: centered spinner card until the session + school resolve.
- Realtime re-fetches are backgrounded and do not flash a full loading state.

## 20. EMPTY STATES

- `EmptyState` (design-system `StateBlock`) is rendered by `DataTable` when a filtered
  result set is empty (e.g., no accounts match, no dismissal requests, no events).
- People/Students/Dismissals/Activity use role-appropriate empty copy
  ("No accounts found", "No dismissal requests", "No events recorded yet", etc.).

## 21. ERROR STATES

- Every page wraps its data fetch in try/catch and, on failure or non-admin role, renders an
  `AccessNote` (info/warning `Alert` + "Sign in" link) instead of the data sections — the
  page never throws to a blank screen.
- Examples: "This area is for school administrators. Sign in to view …",
  "We couldn't load the operations overview. Please try again shortly."
- Login errors are handled in `AuthShell` with generic, account-existence-safe messages
  ("Invalid Admin ID or password." / "This account isn't authorized for this portal.").
- Verified: no unhandled page errors during browser verification.

## 22. PROFILE

`app/admin/profile/page.tsx` — mirrors the Gate/Teacher profile pattern:
- Shows Staff ID (`login_id`), Account type "Administrator", and the server-resolved School
  name (via `users.school_id → schools.name`).
- Sign out button → `adminSignOut()` server action.
- Verified in Chromium: renders "Administrator" and the school, and contains **no UUIDs**.
- (Fixed during this phase: the school lookup previously filtered `users` on `id` instead of
  `user_id`, which 400'd; corrected to `eq("user_id", …)`, so the school now resolves and no
  spurious 400 is emitted.)

## 23. NAVIGATION

- `components/layout/navigation.ts` admin nav: Operations (Overview, People, Students,
  Classes, Dismissals, Activity) + Account (Profile) — rendered by the shared `AppLayout`
  (`AppShell` + `getNavForRole`).
- `AppLayout` provides the responsive sidebar (desktop) / bottom-nav or drawer (mobile)
  already proven in Phases 22–24.
- Cross-role: non-admin sessions are bounced by the server layout guard.

## 24. DESIGN SYSTEM

Built entirely on the Phase 19/21 tokens/classes and the shared components:
`AppLayout`, `Page`/`Section`/`CardGrid`/`Stack`/`Inline`, `Card`, `Button` (primary/
secondary/outline/ghost/danger), `StatusBadge`, `Alert`, `Select`, `Input`/
`PasswordInput`, `DataTable`, `Skeleton`, `Spinner`, `EmptyState`/`LoadingState`,
`Avatar`, `Icon`, `Field`/`DefinitionList`, `Modal`/`Drawer`/`Tabs`/`Toast`.
- `check:tokens` passes: no raw hex colors in `components/`.
- Shared helpers live in `app/admin/_ui.tsx` (`SearchField`, `Pager`, `StatTile`,
  `AccessNote`) — presentational only, no data fetching.

## 25. RESPONSIVE

Verified at 320, 375, 430, 768, 1024, 1440, 1920 px: **0 horizontal overflow** on all 7
routes. The `DataTable` `minWidth` was moved from the `overflow-x-auto` wrapper to the inner
`<table>` so wide tables scroll internally instead of pushing the card wider than the
viewport (a shared-component fix that also benefits Teacher/Gate/Parent tables).

## 26. ACCESSIBILITY

- Semantic headings (`Page` renders an `h1`; `Section`/`CardHeader` render `h2`/`h3`).
- Form fields use labelled `Input`/`PasswordInput`/`Select` with `aria-describedby` error
  wiring; the sign-in button has `aria-label="Sign in"` and `aria-busy`.
- Status conveyed by `StatusBadge` tone + text (not color alone).
- Tables use real `<table>` semantics with scoped headers.
- Focus-visible rings via `focus-visible:ring-ring`.

## 27. PERFORMANCE

- Head-counts use `count: exact, head: true` (no row transfer) for the Overview tiles.
- List pages fetch bounded sets (latest 100 rows) and paginate client-side.
- Realtime uses a single channel per table with reflect-only re-fetch (no polling storms).
- Build output: admin routes ~161–173 kB First Load JS, consistent with sibling portals.

## 28. REAL DATA

All figures are read live from the pilot database via RLS — nothing hardcoded. Observed
during verification (pilot "Tulip" school):
- Students: 18 · Classes: 1 · Parents: 18 · Teachers: 1 · Gate staff: 1
- Dismissal requests: 39 total · Active: 1 · Awaiting teacher: 0 · Dismissed: 12 ·
  Rejected/Cancelled: 26
- Activity: real `dismissal_events` rows rendered with operator login IDs (UUIDs mapped away).

## 29. DEMO DATA AUDIT

- The portal does **not** create, fabricate, or hardcode any users/students/teachers/gate/
  schools/classes/requests/statistics/credentials.
- The pilot `public.users` rows (incl. `ADM-1001`) and student/dismissal data are real
  database rows provisioned by the existing seed/provisioning scripts — the app only READS
  them. Their existence is backend-seeded, not app-injected.
- No production credentials, service-role keys, or UUIDs are exposed in the UI or logs.
- PASS: no fabricated or hardcoded production data anywhere in the Admin code.

## 30. SECURITY

- No second auth system / backend created.
- No RLS / Edge Function / authorization bypass.
- No client-provided `school_id` / `admin_id` trusted (school is server-derived).
- No raw UUIDs / Supabase emails / service-role info surfaced to the Admin UI.
- No security downgrade made to satisfy UI tests.
- Admin is NOT granted Teacher/Gate powers; the layout guard + RLS prevent escalation.
- Passwords are never displayed/stored/logged/transmitted by the portal.

## 31. CROSS-SCHOOL ISOLATION

- Isolation is enforced by RLS, not the frontend: every Admin `SELECT` is scoped by
  `school_id = public.app_school_id()` (migrations `0017`, `0017b`, `0010`, `0011`).
- The Admin portal never sends a `school_id` from the client; visibility is wholly
  server-decided.
- `manage-identity` enforces `target.school_id === caller.school_id` on writes.
- The pilot is **single-tenant** (school "Tulip"), so a full two-school browser exercise is
  not possible without seeding a second school (which would be a data change this phase is
  forbidden from making). Isolation is therefore evidenced by (a) the RLS policy text and
  (b) the absence of any client-supplied tenant parameter. Documented as a limitation in §44.

## 32. CROSS-ROLE AUTHORIZATION

- Admin layout (`app/admin/layout.tsx`) is a server component that calls `getSessionUser`
  and renders "Administrators only" for any non-admin session.
- Verified in Chromium: a signed-in Gate user navigating to `/admin` sees
  "Administrators only" and cannot reach Admin data.
- Admin pages additionally re-check `su.role === "admin"` client-side and fall back to
  `AccessNote` if it ever mismatches.
- Admin has no mutation policies on `dismissal_requests`/`dismissal_events` (SELECT-only), so
  it cannot perform Teacher/Gate workflow actions.

## 33. BROWSER VERIFICATION

Real Chromium (Playwright 1.62.1) against `next start -p 3110`. Widths:
320/375/430/768/1024/1440/1920. **15/15 checks passed:**
- admin-login-redirect (ADM-1001 → /admin)
- route-/admin, /admin/people, /admin/students, /admin/classes, /admin/dismissals,
  /admin/activity, /admin/profile (all load with real data)
- responsive-no-overflow (all 7 widths, 0 px overflow)
- profile-role (shows "Administrator"), profile-no-uuid (no UUID leaked)
- admin-signout (→ /login/admin)
- cross-role-denial (gate → /admin blocked)
- no-console-errors, no-page-errors

One real defect was found and fixed during verification: `/admin/profile` filtered
`users` on `id` (nonexistent column) → 400; corrected to `user_id`. After the fix, 0
console errors. (The DataTable `minWidth` overflow was also fixed.) See §34–§37.

## 34. npm test

`npm test` → 26 tests, 4 suites, **26 pass / 0 fail**. (Includes the teacher decision
RPC mapping and other backend contract tests; unaffected by Admin UI changes.)

## 35. TYPECHECK

`npm run typecheck` (`tsc --noEmit`) → **exit 0, no errors**.

## 36. BUILD

`npm run build` → **success**. Admin routes compiled: `/admin`, `/admin/activity`,
`/admin/classes`, `/admin/dismissals`, `/admin/people`, `/admin/profile`,
`/admin/students` (7 routes). No type/lint errors.

> Note: the local `.next` had entered a corrupt state earlier in the session (from a
> `rm -rf .next/types` performed while diagnosing a stale server). A clean `rm -rf .next`
> + rebuild produced a correct, runnable build. No source was changed to work around it.

## 37. TOKEN CHECK

`npm run check:tokens` (`scripts/check-no-hex.mjs`) → **OK — no raw hex colors in
components/**.

## 38. FILES CHANGED

Created (Phase 25):
- `app/admin/_ui.tsx` (shared presentational helpers)
- `app/admin/actions.ts` (admin sign-out server action)
- `app/admin/people/page.tsx`
- `app/admin/students/page.tsx`
- `app/admin/classes/page.tsx` (rewritten from legacy)
- `app/admin/dismissals/page.tsx`
- `app/admin/activity/page.tsx`
- `app/admin/profile/page.tsx`
- `app/admin/page.tsx` (rewritten: Overview)

Modified (Phase 25):
- `app/admin/layout.tsx` (server admin guard + school context)
- `components/layout/navigation.ts` (admin nav)
- `components/ui/DataTable.tsx` (minWidth moved to inner table — shared fix)
- `lib/dismissal/state.ts` (added status tone/label helpers, reused by Admin)
- `app/admin/profile/page.tsx` (user_id fix)

Deleted (legacy scaffold replaced):
- `app/admin/roster/page.tsx`, `app/admin/users/page.tsx`, `app/admin/monitor/page.tsx`,
  `app/admin/logs/page.tsx`

(Other modified files in `git status` — `app/gate/*`, `app/teacher/*` — are from the
prior Gate/Teacher phases and were already uncommitted; this phase did not touch them.)

## 39. BACKEND CHANGES (NONE)

No backend logic was changed. Admin authorization is consumed as-is from the existing
migrations/RPCs/Edge Functions.

## 40. SUPABASE CHANGES (NONE)

No Supabase migration, RLS policy, RPC, Edge Function, schema, seed, or account was
created, modified, or deleted.

## 41. DEPLOYMENT (NONE)

No `vercel deploy` or any deployment was performed. A local `next start` was used only for
browser verification.

## 42. GIT (no commit/push)

All changes are left **uncommitted** and **unpushed**. No `git commit`, `push`, `amend`,
`reset`, `restore`, `rebase`, or force-push was performed.

## 43. TEMPORARY FILES (removed)

Temporary Playwright debug/verification scripts (`_dbg_login.mjs`, `_dbg_400.mjs`,
`_verify_admin_browser.mjs`) were created for verification only and **deleted** before this
report. None are imported by production code and no secrets/passwords were hardcoded in them
(login passwords were derived as `loginId.toLowerCase()`).

## 44. REMAINING BACKEND LIMITATIONS

- **Identity management / account creation is not exposed in the Admin UI.** The secure
  `manage-identity` Edge Function exists and enforces tenant scoping, but it returns
  one-time plaintext passwords on `create`/`reset`. Surfacing those in the browser would
  violate the password-security rule (§13), so the portal deliberately omits identity
  writes. Provisioning/reset remains a service-role, out-of-band operation. This is the
  principal honest scope limitation of the Admin portal.
- **Full cross-school isolation cannot be exercised in the browser** because the pilot is
  single-tenant. Isolation is guaranteed by RLS (§31) but not demonstrable with two live
  schools without a forbidden data change.
- Admin has no mutation path on dismissal state — by design (the trusted Edge Functions own
  transitions). If product wants Admin to action dismissals, that requires a new secure
  backend contract, not a frontend invention.

## 45. REMAINING FRONTEND LIMITATIONS

- None blocking. The shared `DataTable` overflow fix and the `profile` `user_id` fix are the
  only frontend corrections made this phase; both are now resolved and verified.
- The Admin portal is intentionally read-only for operational/identity workflows (see §44);
  if write capabilities are later authorized via a secure backend contract, corresponding
  UI can be added without redesign (the design system, nav, and guard patterns already
  support it).

## 46. NEXT PHASE

**STOP. Do not start Phase 26.** The Admin application is complete, verified, and meets all
quality gates. Recommended future work (outside this phase, and only if authorized):
- Decide product policy on Admin identity management; if approved, build a credential-handoff
  flow that does NOT render plaintext passwords in the browser (e.g., one-time setup links or
  admin-initiated email resets via the secure function), behind a new secure contract.
- If multi-tenant Admin monitoring is required, seed/verify a second school and exercise
  cross-school isolation in the browser.
- Optionally add Admin mutation capabilities (e.g., acknowledge/cancel) only via new secure
  Edge Function/RPC contracts — never by direct client `update` on protected tables.
