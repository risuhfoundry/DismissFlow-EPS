# PHASE 22 — PARENT APPLICATION REPORT

**Date:** 2026-08-30
**Scope:** Complete production-quality Parent application — Home, Request Dismissal, Active Request + QR, Cancellation, Final Outcomes, Realtime, History, Profile — built on the existing real Supabase backend and the Phase 19 + Phase 21 design system.
**Backend:** UNTOUCHED. Supabase Auth, RLS, Edge Functions, RPCs, tenant isolation, school_id, role authorization, session validation, database, and credentials are all unchanged.
**Deployment:** Local implementation + verification only. No deploy performed.

---

## 1. Verdict

**PARENT APPLICATION READY.** The Parent application is fully implemented on the real Supabase backend and the Phase 19/21 design system, reusing shared primitives throughout. All quality gates pass — `npm test` 26/26, typecheck clean, `check:tokens` clean, production build of 17 routes succeeds — and a real end-to-end browser run against the live backend passes 21/21 checks across 320–1920 px with zero horizontal overflow. The backend, Supabase configuration, and git history were not modified.

---

## 2. Product Experience

The Parent portal feels like a real school product, not a prototype. A signed-in parent lands on **Home**, which answers the core questions in order: *Who am I?* (time-based greeting + linked-child context), *Which child?* (a real, RLS-linked child card with name, admission number, class, and section), *Can I request dismissal?* (a prominent primary action when idle), *Is there an active request?* (a prominent, status-aware panel), and *What is the current status?* (a plain-language status badge with a next-step sentence). Navigation is minimal — **Home / History / Profile** — with no Teacher, Gate, or Admin links exposed. Every screen uses the calm, light Phase 19 language (cards, soft tones, clear hierarchy) and none of the legacy mono/technical "V0.1 / DISMISS / MIT" styling.

---

## 3. Home

`app/parent/page.tsx` is a client component that maintains the exact backend contract from the prior implementation while reskinning onto `Page`, `Section`, `Card`, `Button`, `StatusBadge`, `Alert`, `Modal`, `Skeleton`, `Avatar`, and `Icon`. On load it resolves the session (RLS-scoped), fetches the linked student and class, and fetches any in-flight active request (`status IN (REQUESTED, AWAITING_TEACHER)`). The page renders a greeting (`Good morning/afternoon/evening`), a **Your child** section (child card), and a **Pickup** section that switches between idle, active, and final states. A subtle "Live" connection pill (from `useRealtimeStatus`) sits in the page header.

---

## 4. Child

The linked child is rendered from the RLS-scoped `students` row joined to `classes`. The card shows the child's name, admission number, class, and section — driven entirely by real data, with **no hardcoded names or class values**. An `Avatar` (initials) anchors the card. There is no separate "select a child" step because the parent account is linked to exactly one student per the backend model; the UI reflects whatever the server returns.

---

## 5. Request Dismissal

The idle state shows a clear **"Request dismissal"** primary button. On click it calls the existing `createDismissalRequest()` Edge Function (no direct insert), then re-fetches the authoritative row (RLS-scoped to the linked student) and stores the one-time `token`. The button is disabled and shows a spinner while requesting, preventing duplicate submission. Errors are mapped to friendly copy with no raw Supabase error surfaced: `CONFLICT`/409 → *"An active dismissal request already exists for this student."*, otherwise *"Could not create the dismissal request. Please try again."*

---

## 6. Active Request

When an active request exists (on load or after creation) the **Pickup in progress** panel becomes prominent, showing a `StatusBadge` with `pulse` and a plain-language next step:
- **Requested** → *"Your pickup request was sent and is waiting for the teacher to confirm."*
- **Approved** (AWAITING_TEACHER) → *"The teacher approved the pickup. Show your code to gate staff for release."*

Status is derived solely from server data (`dismissalStatusMeta`), never from the browser. The active panel hosts the QR reveal and, for `REQUESTED`, the cancel control.

---

## 7. QR

The QR is rendered by the shared `DismissalQr` component, which encodes **only the opaque server-issued token** (no student name, admission number, or PII). The reveal includes the QR, a clear instruction (*"Present this code to gate staff when you arrive. It is single-use and valid only for this pickup."*), and a countdown derived from `expires_at`. The countdown is explicitly presentation-only: it is labelled *"This timer is a guide only — the school system confirms when your code is used."* so the frontend never asserts validity. On a full reload with an active request but no in-memory token, the panel honestly states the code was generated earlier and offers cancel-and-re-request instead of fabricating a QR. The raw token string is **never displayed**.

---

## 8. Cancellation

Cancellation is gated behind a confirmation `Modal` (focus trap, Esc-to-close, backdrop click, focus restore — all provided by `Modal`). Confirming calls the existing `cancelDismissal(requestId)` Edge Function (never a direct DB write). On success the UI reflects the `CANCELLED` outcome and clears the QR token. Errors map to *"This request can no longer be cancelled."* (REQUEST_NOT_CANCELLABLE/409) or a generic retry message. Realtime never decides cancellation — it only reflects the server's authoritative transition.

---

## 9. Final Outcomes

When the request reaches a terminal state the UI shows a clear closure card (icon + title + detail) and a contextual next action:
- **DISMISSED** → "Dismissal completed." (success)
- **REJECTED** → "Request rejected." (danger)
- **CANCELLED** → "Request cancelled." (neutral)
- **EXPIRED** → "Request expired." (warning)

"Request dismissal again" is offered on every final outcome (the backend permits a new request once none is active). These states are reached via the realtime handler or the local cancel, never asserted by the browser.

---

## 10. Realtime

The existing `useTableChanges`/`useRealtimeStatus` architecture is reused. The realtime handler reflects server changes only: it guards on `student_id` (ignores mismatched/stale payloads), replaces the view for active states, and updates only the *same* in-flight request on a final state so a historical row can never hijack the dashboard. It clears the QR token on any non-active transition. Subscriptions are RLS-filtered (the browser sees only the linked student's rows), are torn down on unmount, and surface a connection pill. **Realtime never decides auth, ownership, status, approval, or QR validity** — the server remains authoritative.

---

## 11. History

`app/parent/history/page.tsx` fetches `dismissal_requests` RLS-scoped to the linked student (`order by created_at desc`, `limit 50`). It renders a responsive `Card` list of date/time + `StatusBadge` per request, a `LoadingState` skeleton while fetching, an `EmptyState` ("No requests yet") when empty, and an `Alert` on error. A **Refresh** button re-runs the fetch. No internal IDs or emails are shown; tenant scoping is enforced by RLS, not client filtering.

---

## 12. Profile

`app/parent/profile/page.tsx` shows the **linked child** (name, class, admission number), the **account type** ("Parent"), and the **school** context when reachable under RLS — all from real data. Critically, it shows **no Supabase email, no Auth UUID, no internal IDs, and no service-role material**. Sign-out uses the server action `parentSignOut` (clears the session cookie server-side, then redirects to `/login`), reusing the shell's account-menu sign-out. A "Sign out" button is also provided on the page for explicitness.

---

## 13. Security

No backend, Auth, RLS, Edge Function, RPC, tenant-isolation, school_id, role-authorization, session-validation, database, or credential changes were made. The browser performs **no direct database writes** — all mutations go through the existing Edge Functions (`create-dismissal-request`, `cancel-dismissal`). No service-role key or secret exists in `app/`, `components/`, or `lib/`. Authorization is enforced by RLS; the client only assembles `{ request_id }` (cancel) or `{}` (create) and never derives identity, ownership, status, approval, or QR validity. Errors are user-friendly and never leak raw Supabase messages. The QR encodes only the opaque token.

---

## 14. Tenant Isolation

Parents are SELECT-only on `dismissal_requests`, `students`, and `classes`; all policies are tenant-scoped by `school_id = app_school_id()`. `qr_tokens` remain server-only (no client policy). The UI cannot display another school's students, requests, history, or profile — every query is RLS-bounded to the linked student, and client-side filtering is never used as a security control. The account menu and header school pill are derived from the server-resolved session/student, never from anything the browser supplies.

---

## 15. Responsive

Verified via Playwright `setViewportSize` at **320, 375, 390, 430, 768, 1024, 1440, and 1920 px**. `document.documentElement.scrollWidth - window.innerWidth` was measured after each resize; the threshold was >1px. **No horizontal overflow at any tested width**, including the smallest (320). Layout uses `max-w-content`, responsive padding, stacked cards on mobile, a desktop sidebar, and a mobile navigation drawer. Touch targets (`Button` size `lg`/`md`) meet comfortable minimums.

---

## 16. Accessibility

- Semantic structure: `<main>`, `h1` (greeting) → `h2` (section titles) → `h3` (card titles).
- Visible labels, `aria-live` status regions (`Alert` → `role="status"` for success/info, `role="alert"` for errors), and an `aria-live` connection indicator.
- The cancel `Modal` traps focus, closes on Esc/backdrop, and restores focus on close (`role="dialog"`, `aria-modal`).
- Buttons expose `aria-busy` + disabled while loading; the QR has an explanatory caption; the countdown is accompanied by a plain-language note.
- Visible keyboard focus (`focus-visible:ring-ring`); `prefers-reduced-motion` is honored globally.
- Verified in-browser: sign-in → request → QR → cancel → history → profile → sign-out all operate without console or page errors.

---

## 17. Browser

Automated with real Chromium (Playwright) against a production `next start` server on port 3110, using a real provisioned parent account (admission number resolved server-side, never printed). Results — **21/21 PASS**:

| Check | Result |
|---|---|
| Parent sign-in redirects to `/parent` | ✅ |
| Home shows greeting `h1` | ✅ |
| Home shows linked child section | ✅ |
| Home shows pickup section | ✅ |
| Home renders request or active state | ✅ (idle) |
| Request dismissal reveals QR | ✅ |
| QR code renders (svg) | ✅ |
| Active status badge visible | ✅ |
| Countdown / expiry shown | ✅ |
| Cancel confirmation modal opens | ✅ |
| Cancel finalizes to cancelled outcome | ✅ |
| No horizontal overflow @320/375/390/430/768/1024/1440/1920 | ✅ |
| No console/page errors on home | ✅ |
| History page renders `h1` | ✅ |
| History shows rows or empty state | ✅ |
| No horizontal overflow on history @390/768 | ✅ |
| Profile page renders `h1` | ✅ |
| Profile shows linked child | ✅ |
| Profile exposes no email/uuid/supabase token | ✅ |
| No horizontal overflow on profile @390/768 | ✅ |
| Sign out returns to `/login` | ✅ |

One real dismissal request was created during the run and then **cancelled**, leaving no active record and no junk production data.

---

## 18. Test

```
# tests 26
# suites 4
# pass 26
# fail 0
```

`npm test` — all 26 existing unit tests pass. No test files were modified.

---

## 19. Typecheck

```
npm run typecheck  →  tsc --noEmit  →  clean (no errors)
```

---

## 20. Build

```
npm run build  →  success
17 routes built, including:
  /parent               16.4 kB   183 kB First Load
  /parent/history       3.58 kB  170 kB First Load
  /parent/profile       3.36 kB  161 kB First Load
```

All parent routes build and prerender/SSR correctly with no missing chunks, hydration errors, or broken routes.

---

## 21. Token Check

```
npm run check:tokens  →  node scripts/check-no-hex.mjs
check-no-hex: OK — no raw hex colors in components/
```

The Parent application uses only Phase 19 semantic tokens (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `ring-ring`, `shadow-card`, `bg-primary-soft`, `text-primary`, `bg-success-soft`, `text-success`, `bg-destructive-soft`, `text-destructive`, `bg-warning-soft`, `text-warning`, `rounded-xl`, `max-w-content`, `text-h1/h2/h3/title`, `animate-fade-in`). No raw hex, gradients, glassmorphism, or fake stats were introduced.

---

## 22. Files Changed

**Rewritten (Phase 22):**
- `app/parent/layout.tsx` — server component now wraps children in the shared `AppLayout` (role `parent`), resolving the user name and optional school name server-side (RLS-scoped) and wiring `parentSignOut`.
- `app/parent/page.tsx` — full Home rewrite onto Phase 19 primitives (greeting, child card, idle/active/outcome panels, QR reveal, cancel modal, realtime handler preserved).
- `app/parent/history/page.tsx` — full History rewrite onto `Page`/`Card`/`StatusBadge`/`EmptyState`/`LoadingState`.
- `app/parent/profile/page.tsx` — full Profile rewrite; shows no email/UUID/internal IDs; server-action sign-out.
- `components/layout/navigation.ts` — parent nav labels updated to **Home / History / Profile**.

**Created (Phase 22):**
- `app/parent/actions.ts` — server action `parentSignOut` (session cookie cleared server-side, redirect to `/login`).
- `lib/dismissal/status-meta.ts` — shared status→presentation mapping (label, tone, next-step) reused by Home and History.
- `verify-parent.mjs` — untracked Playwright verification harness for the parent flow.

No backend, library (`lib/auth/*`, `lib/dismissal/client.ts`, `lib/realtime/subs.ts`), UI primitive, or Supabase files were modified beyond the above.

---

## 23. Backend Changes

**NONE.** `create-dismissal-request`, `cancel-dismissal`, related RPCs, RLS policies, and the `dismissal_requests` / `students` / `classes` schemas are byte-for-byte unchanged. The dismissal contract (status enum, token-once semantics, school_id enforcement) is preserved exactly.

---

## 24. Supabase Changes

**NONE.** No migrations, RLS policy changes, Edge Function changes, or configuration changes were made.

---

## 25. Deployment

**NONE.** Per the phase directive, this was local implementation + verification only. No `vercel deploy --prod`, no environment changes, no DNS/production changes were performed. The verification server ran locally on port 3110.

---

## 26. Git

**Untouched.** No commits, pushes, amends, resets, rebases, or force-pushes were made. The working tree contains the Phase 22 changes listed in §22 plus pre-existing untracked verification artifacts (e.g. `verify-login.mjs`, prior phase reports) left from earlier phases. Nothing was committed.

---

## 27. Remaining Issues

- None blocking. All 21 browser checks, 26 unit tests, typecheck, token check, and the 17-route build pass. The one real dismissal request created during verification was cleanly cancelled, leaving no active or junk production record.
- Optional cleanup: `verify-parent.mjs` and other untracked `verify-*.mjs` scripts are local verification artifacts and can be deleted before any future commit if desired.

---

## 28. Next Phase

**STOP. Do not start Phase 23.** The Parent application is complete and verified against the real backend. Awaiting direction before any subsequent phase.

---

**FINAL VERDICT: PARENT APPLICATION READY.**
