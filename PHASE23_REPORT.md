# Phase 23 — Teacher Application Build Report

## 1. Phase & Title
**Phase 23 — Build the complete, production-quality Teacher application** on the existing real Supabase backend, to the same quality bar as the completed Parent application (Phase 22). Reuses the Phase 19/21 design system and the Phase 22 Parent architecture.

## 2. Summary / Verdict
**VERDICT: TEACHER APPLICATION READY.**

The Teacher application is fully built against the real backend using the existing `approveDismissal` / `rejectDismissal` Edge Function contracts, the shared Phase 19/21 design system, and the Phase 22 `AppLayout` / `Page` / `Card` / `Button` / `StatusBadge` / `Alert` / `Modal` component set. All four quality gates pass, real-browser Playwright verification passed **20/20** with **zero console errors**, and cross-role denial is enforced in both directions by server-side layout guards + RLS.

All code changes are intentionally **left uncommitted** per the security constraints.

## 3. Objective
Deliver a complete Teacher portal: auth, role-guarded shell, a live `AWAITING_TEACHER` queue for the teacher's assigned class, a request-detail page with approve/reject decisions (confirmation modal, conflict handling), a profile page, and design-system-only UI — verified in a real browser at 320–1920 px with WCAG 2.2 AA and a security audit.

## 4. Scope
- Teacher auth (reuse `signInById` + `AuthShell`) and `teacherSignOut` server action.
- Identity/school resolution from `assigned_class_id` → `classes` → `schools`.
- Shell/navigation: **Queue** and **Profile** only. No parent/gate/admin nav.
- Home = real `AWAITING_TEACHER` queue (RLS-scoped to the teacher's class + school).
- Request detail: status, student, guardian, decision (Approve & Dismiss / Reject).
- Reject confirmation modal + concurrent-decision/conflict handling.
- Realtime **reflect-only** re-fetch (`useTableChanges` / `useRealtimeStatus`).
- Loading / error / empty states; profile; responsive 320–1920; WCAG 2.2 AA.
- Real-browser Playwright verification (20 checks, 0 console errors); cross-role denial tests.
- All four quality gates.

## 5. Prerequisites & Environment
- Next.js 14 App Router, TypeScript, React.
- Existing Supabase project (real, RLS-tenant-scoped). No schema/RPC/Edge-Function/migration changes were made.
- Backend decision contracts: Edge Functions `approve-dismissal` / `reject-dismissal` → `teacher_decide_request` SECURITY DEFINER RPC (service-role only).
- Local env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (used only by the deleted temporary verification script, never in the client bundle).

## 6. Backend Contract Verification
- `lib/dismissal/client.ts` `approveDismissal(requestId)` → `functions.invoke("approve-dismissal", { method:"POST", body:{ request_id } })`.
- `rejectDismissal(requestId)` → `functions.invoke("reject-dismissal", { method:"POST", body:{ request_id } })`.
- Both throw a parsed `{ code, message, status }` `InvokeError`. The detail page maps codes: `UNAUTHENTICATED`/`UNAUTHORIZED`, `TEACHER_REQUIRED`/`FORBIDDEN`, `TEACHER_CLASS_FORBIDDEN`, `TEACHER_SCHOOL_FORBIDDEN`, `REQUEST_NOT_FOUND`, `REQUEST_NOT_AWAITING_TEACHER`, `INVALID_DECISION`/`INVALID_REQUEST`.
- No replacement contracts, no direct DB mutations, no client-supplied `school_id`/`teacher_id`. Verified by reading `lib/dismissal/client.ts` and the Edge Functions + `0007_teacher_decision.sql`.

## 7. Architecture Reuse (Phase 19/21 + Phase 22)
- `AppLayout` (TopHeader + Sidebar + Drawer + ToastProvider), `getNavForRole("teacher")` for config-driven nav.
- `Page`, `Section`, `Card`/`CardHeader`/`CardContent`, `Button`/`DangerOutlineButton`, `IconButton`, `StatusBadge`, `Alert`, `Modal`, `Avatar`, `Skeleton`, `EmptyState` (`StateBlock`), `Field`/`DefinitionList`, `Input`/`PasswordInput`.
- Realtime: `useTableChanges` / `useRealtimeStatus` (`lib/realtime/subs.ts`) — RLS-filtered, reflect-only.
- Server-action sign-out pattern modeled on `parentSignOut` (`teacherSignOut`).

## 8. Identity & School Resolution
- Teacher identity is the `login_id` (e.g. `tch-1001`). `users` has no `name` column; the staff ID is the account identity surfaced in the header and profile.
- `schoolName` resolved server-side: `assigned_class_id` → `classes(school_id)` → `schools(name)`. Optional; never blocks rendering.

## 9. Teacher Authentication & Session
- `/login/teacher` uses `AuthShell` with `signInById("teacher", identifier, password)` (real Supabase Auth). Email = `${login_id.toLowerCase()}@demo.dismissflow`, password = `login_id`.
- After sign-in, `getSessionUser` re-derives role server-side; a role mismatch signs the session out (the browser never asserts a role).

## 10. Role Guard (Layout)
- `app/teacher/layout.tsx`: resolves `getSessionUser` server-side. A confirmed non-teacher profile renders a "Teachers only" card (does not crash). Unauthenticated callers pass through to the client page, which shows a friendly sign-in note. Authorization is enforced by RLS; the layout only materializes role scope.
- Mirror: `app/parent/layout.tsx` blocks non-parents with "Parents only".

## 11. Navigation Configuration
- `components/layout/navigation.ts` `getNavForRole("teacher")` → `[{ items: [Queue `/teacher`, Profile `/teacher/profile`] }]`. The phantom "Classes" `/teacher/classes` link from the prior scaffold was removed.

## 12. Queue Page (`app/teacher/page.tsx`)
- RLS-scoped query: `.from("dismissal_requests").select(...).eq("status","AWAITING_TEACHER").order("updated_at",{ascending:true}).limit(50)`. **No client-side class filter** — the browser never supplies one.
- Renders `Page` (title = class label e.g. "Tulip · B", live `StatusBadge`) → `Section "Pending pickups"` → `Card` with student rows linking to `/teacher/[requestId]`, or `EmptyState` ("You're all caught up." / "There are no dismissal requests waiting for your attention.").
- Loading → skeleton rows; access card when not signed in / not teacher / no class.

## 13. Request Detail Page (`app/teacher/[requestId]/page.tsx`)
- `STATUS_META` (teacher-appropriate): `AWAITING_TEACHER` → "Awaiting your decision" (info); `DISMISSED` → "Dismissed" (success); `REJECTED` → "Rejected" (danger); etc. Distinct from the parent's "Approved" label.
- Loads request (RLS makes other-class requests invisible → "not found"), student + `class_name`, guardian via `student_guardians`+`guardians`, scan time via `dismissal_events`.
- Cards: Request status, Student, Guardian, Decision.

## 14. Approve Flow
- `Button "Approve & dismiss"` → `approveDismissal(request_id)` → `loadRequest()` re-fetch (authoritative server state) → success Alert "Student dismissed. The parent has been notified in real time."

## 15. Reject Flow (Confirmation Modal)
- `DangerOutlineButton "Reject"` → `Modal "Reject this request?"` with "Keep request" / "Confirm reject". "Confirm reject" → `rejectDismissal(request_id)` → re-fetch → Alert "Request rejected. The parent has been notified in real time."

## 16. Concurrent / Conflict Handling
- If `REQUEST_NOT_AWAITING_TEACHER`, the UI reloads and shows "This request was already handled by another teacher." Other error codes map to specific title/detail copy (session expired, not authorized, wrong class, wrong school, not found, invalid request).

## 17. Realtime (Reflect-Only)
- `useTableChanges` handler upserts `AWAITING_TEACHER` rows (replace by `request_id`, re-sort) and drops any other status (decided elsewhere). RLS already limits the stream to the teacher's class; the handler also guards on status. The browser never authoritatively inserts/deletes rows — it re-fetches after every decision.

## 18. Profile Page (`app/teacher/profile/page.tsx`)
- Cards: "Your role" (Avatar + Staff ID + Account type "Teacher"), "Assigned class", "School" (if resolved), "Session" (Sign out → `teacherSignOut`).
- Mirrors the Parent profile structure; resolves class/section/school from `assigned_class_id`.

## 19. Loading States
- Queue: skeleton rows (avatar + two lines + badge). Detail: skeleton cards (status + student). Profile: centered spinner card.

## 20. Error States
- Detail access cards: not signed in (sign-in CTA), not a teacher (home CTA), not found / wrong class (home CTA), load failure (retry CTA).
- Queue access cards: not signed in, not a teacher, no assigned class, load failure.
- Decision errors render an `Alert tone="danger"` with the mapped message.

## 21. Empty States
- Queue empty (`rows.length === 0`): `EmptyState icon="clipboard" title="You're all caught up." description="There are no dismissal requests waiting for your attention."`.

## 22. Design System Compliance
- All UI uses design-system tokens/classes (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `shadow-card`, `rounded-xl`, `max-w-content`, `text-h1/h2/h3/title/label`, `animate-fade-in`, etc.). No raw hex colors.
- `check:tokens` passes: "OK — no raw hex colors in components/".
- Legacy divergent components (`TopNav`, `Panel`, `MonoLabel`, `StatusIndicator`, `AccessNote`, `framer-motion`, `text-bone`, `font-display`, `section-shell`) were removed from Teacher usage; shared legacy components left intact for Gate/Admin.

## 23. Responsive Behavior
- Verified at 320, 375, 430, 1024, 1920 px on `/teacher`, `/teacher/profile`, `/teacher/[requestId]`, `/login/teacher`: **no horizontal overflow** (`documentElement.scrollWidth ≤ innerWidth + 1`).

## 24. Accessibility (WCAG 2.2 AA)
- Semantic landmarks (`main`, `Page` headings), labelled form fields (`AuthShell` `htmlFor`/`id`), `aria-describedby` on identifier/password, `aria-busy` on submit, `Alert` roles, `Modal` focus handling, status conveyed by text + tone (not color alone), `StatusBadge` labels are textual, focus-visible rings via design tokens, responsive tap targets ≥ 44px (`h-11` inputs/buttons).

## 25. Security Audit
- No mock/fake/demo data in the product UI; no hardcoded credentials.
- Browser never decides role/school/identity/ownership/authorization — backend (`teacher_decide_request` RPC + RLS) is authoritative.
- No RLS/Edge-Function/authorization bypass; no client-supplied `school_id`/`teacher_id`.
- No direct mutation of protected workflow tables; decisions go only through `approveDismissal`/`rejectDismissal`.
- No service-role key in the client bundle or `NEXT_PUBLIC_*`; the service-role client existed only in the **deleted** temporary verification script.
- Auth remains Supabase Auth + RLS; single auth backend; no second auth/backend.
- No Supabase schema/RPC/Edge-Function/migration/permission changes were made (none were required).
- No `vercel deploy`; changes left **uncommitted** (no `git commit`/`push`/history rewrite).

## 26. Cross-Role Denial Tests
- Logged-in teacher → `/parent` renders "Parents only" (parent layout guard). PASS.
- Logged-in parent (`5851`) → `/teacher` renders "Teachers only" (teacher layout guard). PASS.
- RLS ensures a teacher's queue/detail query cannot see another class's requests (invisible → "not found").

## 27. Quality Gate 1 — Typecheck
`npm run typecheck` → `tsc --noEmit` → exit 0, no errors.

## 28. Quality Gate 2 — Design Tokens
`npm run check:tokens` → `node scripts/check-no-hex.mjs` → "OK — no raw hex colors in components/".

## 29. Quality Gate 3 — Unit Tests
`npm test` → `lib/qr` (crypto, scan) + `lib/teacher/__tests__/decision.test.ts` → **26/26 pass, 0 fail**.

## 30. Quality Gate 4 — Build
`npm run build` → 18 routes generated, including:
- `ƒ /teacher` 4.83 kB / 171 kB First Load JS
- `ƒ /teacher/[requestId]` 7.25 kB / 174 kB
- `ƒ /teacher/profile` 3.44 kB / 161 kB
- Build exit 0.

## 31. Browser Verification (Playwright, real Chromium)
Server: `next start -p 3110`. Real Supabase backend. **20/20 checks, 0 console errors:**
1. teacher has assigned class with students (class=6b0eee…, 18 students) — PASS
2. created AWAITING_TEACHER (approve) via real Edge Functions — PASS
3. login page heading present — PASS
4. teacher login redirects to /teacher — PASS
5. queue shows "Pending pickups" — PASS
6. realtime status reaches "Live" — PASS
7. queue reflects created AWAITING_TEACHER record (name "AYAANSH RAI", 2 links) — PASS
8. detail shows "Awaiting your decision" — PASS
9. detail shows decision controls (Approve & dismiss / Reject) — PASS
10. approve decision completes (DISMISSED) — PASS
11. reject confirmation modal opens — PASS
12. reject decision completes (REJECTED) — PASS
13. profile renders (Account type present) — PASS
14. profile shows Staff ID tch-1001 — PASS
15. profile shows "Account type Teacher" — PASS
16. profile shows "Sign out" — PASS
17. teacher blocked from /parent (Parents only) — PASS
18. no horizontal overflow 320/375/430/1024/1920 — PASS
19. parent blocked from /teacher (Teachers only) — PASS
20. zero browser console errors — PASS

## 32. Test Records & Cleanup (Safe Workflow Test)
- To exercise the real decision path without leaving junk, the (now-deleted) verification script created short-lived `AWAITING_TEACHER` records via the **existing** Edge Functions (`create-dismissal-request` as the parent + `scan-qr` as the gate), verified the approve (DISMISSED) and reject (REJECTED) decisions in the browser, then **deleted** the temporary requests via the service-role client in a `finally` block. No production data was left behind; the script file was removed before this report.
- No `admission_no` was assumed free — a free student in the teacher's class was selected dynamically (the per-student active-request unique index blocks a second concurrent request).

## 33. Files Created
- `app/teacher/actions.ts` — `teacherSignOut` server action (mirrors `parentSignOut`).
- `app/teacher/profile/page.tsx` — Teacher profile (Staff ID, class, school, sign-out).
- `scripts/_verify_teacher.mjs` — **temporary; deleted** after verification.
- `scripts/_diag_teacher.mjs` — **temporary; deleted** after verification.

## 34. Files Modified
- `app/teacher/layout.tsx` — rewritten to mirror the Parent layout (server `getSessionUser`, "Teachers only" guard, `AppLayout` role="teacher", school resolved from `assigned_class_id`).
- `app/teacher/page.tsx` — rewritten to the real RLS-scoped `AWAITING_TEACHER` queue using the design system.
- `app/teacher/[requestId]/page.tsx` — rewritten to the design-system detail page with approve/reject, modal, conflict handling.
- `components/layout/navigation.ts` — `getNavForRole("teacher")` now Queue + Profile (removed phantom "Classes" link).

## 35. Risks / Limitations
- Teacher identity has no `name` column (by design); the staff ID (`tch-1001`) is the displayed identity. If a display name is later required, it must come from a backend field, not client input.
- Realtime is reflect-only; the authoritative state is always re-fetched after a decision. A stale "Awaiting decision" button is guarded by the `REQUEST_NOT_AWAITING_TEACHER` conflict path.
- The decision path depends on the gate having scanned the QR (request must be `AWAITING_TEACHER`); a `REQUESTED` request shows the "awaiting gate scan" note rather than decision buttons.

## 36. Out of Scope (Explicit Non-Goals)
- No new backend contracts, migrations, RPCs, Edge Functions, or RLS changes.
- No parent/gate/admin functionality added (those portals are separate phases).
- No deployment, no git commit/push, no history rewrite.
- No mock/demo data injected into the product or left in the database.

## 37. Final Verdict
**TEACHER APPLICATION READY.** The Teacher application is complete and production-quality: it reuses the Phase 19/21 design system and Phase 22 Parent architecture, calls only the existing `approveDismissal`/`rejectDismissal` backend contracts, enforces role/school/class scoping via RLS + server-side layout guards, passes all four quality gates (typecheck clean, no raw hex tokens, 26/26 tests, build of 18 routes), and passed real-browser verification **20/20 with zero console errors** including the approve/reject decisions, cross-role denial in both directions, and responsive no-overflow from 320–1920 px. All changes remain uncommitted per the security constraints.

**STOP — Phase 24 not started.**
