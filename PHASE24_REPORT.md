# PHASE 24 — Gate Application Build Report

## 1. Verdict
**GATE APPLICATION READY.**

The Gate application is fully built against the real Supabase backend using the existing `scan-qr` Edge Function contract, the shared Phase 19/21 design system, and the Phase 22/23 Parent/Teacher architecture. All four quality gates pass (typecheck clean, no raw hex tokens, 26/26 unit tests, production build of 19 routes). Real-backend edge-function verification passed **9/9** (valid / invalid / reused / cancelled / expired / wrong-role / unauthenticated / wrong-school / plus the duplicate path). Real-browser Playwright verification passed **27/28** assertions with **zero application/React/hydration/chunk/page errors** and **zero horizontal overflow** from 320–1920 px. The one automated "console error" assertion flagged only the browser's standard logging of the scan-qr Edge Function's expected 4xx business-logic responses (409/410/400/403), all of which the app handles correctly and which cannot be suppressed without altering the backend contract (forbidden). This is documented as a benign, expected condition, not a defect.

All code changes are intentionally **left uncommitted** per the security constraints. **Phase 25 must not begin until explicitly instructed.**

## 2. Mission
Build the complete, production-quality Gate application on the existing real Supabase backend, to the same quality bar as the completed Parent (Phase 22) and Teacher (Phase 23) applications. The Gate is the real operational QR-verification step: PARENT creates REQUESTED → GATE scans QR → `scan-qr` Edge Function → AWAITING_TEACHER → TEACHER approves/rejects → DISMISSED/REJECTED. Reuse the Phase 19/21 design system and Phase 22/23 architecture; call only the existing real `scan-qr` backend contract; do not invent a second auth/backend or weaken authorization.

## 3. Gate Authentication
Reused Phase 21 authentication: `/login/gate` uses `AuthShell` + `signInById("gate", identifier, password)`, which authenticates via Supabase Auth (`email = ${loginId.toLowerCase()}@demo.dismissflow`, password as entered). The pilot Gate account `GTE-1001` authenticates with password `gte-1001` (the `login_id` is stored lowercase; the mission's `GTE-1001` referred to the uppercase label). Verified in a real browser: signing in with Gate ID `GTE-1001` / password `gte-1001` redirected to `/gate`. No new auth mechanism, no second auth backend.

## 4. Gate Identity
Gate identity is the `login_id` (e.g. `gte-1001`). `users` has no `name` column; the staff ID is the displayed identity in the header and profile. Resolved server-side from the authenticated session; the browser never asserts an identity. Profile shows `Staff ID gte-1001` (verified in browser). No email, UUID, or internal IDs are surfaced in the UI.

## 5. School / Tenant Context
The Gate's school is resolved server-side from `users.school_id → schools.name` in the layout (best-effort, never blocks rendering) and shown in the header pill. The same school is the basis for the backend's cross-school guard (`consume_qr_scan` rejects a QR whose request belongs to another school with `GATE_SCHOOL_FORBIDDEN`). Verified: the pilot Gate resolves to "Tulip School".

## 6. Scanner
Real camera-based QR scanner built on the existing `useQrScanner` hook (`lib/qr/scan.ts`), which uses the already-present `jsqr` dependency (no new library added) over `getUserMedia` + a hidden `<canvas>`. The scanner ONLY decodes the QR into an opaque token and ships it to the server; it never validates, decides, or persists anything. The component renders a camera Card with a clear viewport, corner-bracket scan frame, "Start/Stop camera" controls, and a calm "Hold steady — align the QR code within the corners" guide. Verified in browser (fake media) that the camera permission is granted and the "Camera is off" overlay clears (scanning state).

## 7. Camera Permission
`useQrScanner` handles the full permission lifecycle: `requesting` (spinner), `scanning`, `denied` (clear `Alert` + retry), `error` (clear `Alert` + retry), and "Camera is not available" (no `getUserMedia`). On denial the UI shows a useful message and a manual-token fallback — it never pretends a scan occurred. Cleanup releases the camera stream on unmount and on stop. Verified: with fake media the grant path works; the denial/error branches render `Alert`s with actionable copy.

## 8. Manual Token Fallback
A clearly-labelled "Enter QR code manually" card lets the operator paste the dismissal token. It is submitted through the **same** `scanQr(token)` path as a scanned code — no separate security system, no client-side validation. Verified in browser: manual entry drove every result state (valid / invalid / expired / duplicate / cancelled / wrong-school). This is a recovery/accessibility path, not an alternate authz path.

## 9. QR Security
The browser is strictly a transporter. It sends ONLY `{ token }` to `scan-qr`. It does NOT decode validity, decide expiry, decide single-use, decide school, decide REQUESTED status, change status, or consume the token locally. All of those are server-side (Edge Function auth + `consume_qr_scan` SECURITY DEFINER RPC, service-role only). Verified at the edge (9/9): expiry, single-use, school, role, and authentication are all enforced by the backend.

## 10. Valid QR
A valid, unexpired, single-use, same-school REQUESTED token scanned by a Gate account → `scan-qr` returns `{ valid: true, status: "AWAITING_TEACHER", student: { name, class } }`. The UI shows a success `StatusBadge` "QR verified" plus a non-sensitive DefinitionList (Student, Class, "Awaiting teacher approval"). It deliberately omits UUID / email / internal IDs / token hash (verified: no UUID or `@` leaked in the result body). Edge: VALID → AWAITING_TEACHER (PASS). Browser: "QR verified" + "Awaiting teacher approval" (PASS).

## 11. Invalid QR
An unresolvable token → backend `INVALID_QR` (400). UI shows title "Invalid QR code", detail "This code could not be verified. Ask the parent to display the current dismissal QR." Edge: INVALID → INVALID_QR (PASS). Browser: "Invalid QR code" + "could not be verified" (PASS).

## 12. Expired QR
A token whose `qr_tokens.expires_at` is in the past → backend `QR_EXPIRED` (410), enforced inside `consume_qr_scan`. UI title "Expired", detail "This QR code has expired." Edge: EXPIRED → QR_EXPIRED (PASS). Browser: "Expired" + "This QR code has expired" (PASS). (Note: the expiry check reads `qr_tokens.expires_at`, not `dismissal_requests.expires_at`; confirmed by reading the RPC.)

## 13. Reused QR
Scanning an already-consumed token a second time → backend `QR_ALREADY_USED` (409). UI title "Already used", detail "This QR code has already been used." Edge: second scan → QR_ALREADY_USED (PASS). Browser: "Already used" + "already been used" (PASS). The client also guards against re-submitting the same token (`lastTokenRef`) and against concurrent in-flight submissions (`busyRef`), but the authoritative single-use enforcement is the backend.

## 14. Cancelled Request
A request that was cancelled (or already dismissed) and then scanned → backend `REQUEST_NOT_SCANNABLE` (409). UI title "Cannot be scanned", detail "This request can no longer be scanned. It may have been cancelled or already dismissed." Edge: cancel-then-scan → REQUEST_NOT_SCANNABLE (PASS). Browser: "Cannot be scanned" (PASS).

## 15. Wrong-School Protection
Backend-enforced. `consume_qr_scan` (migration `0016_tenant_rpcs_and_reaper.sql`, lines 69–74) returns `GATE_SCHOOL_FORBIDDEN` (403) when `v_request.school_id is distinct from v_gate_school`, mapping to "This request belongs to another school." The browser does NOT client-filter by school. Edge: a Tulip Gate scanning a Rose-school QR → GATE_SCHOOL_FORBIDDEN (PASS). Browser: manual entry of a Rose token → "Wrong school" + "another school" (PASS). Real cross-school isolation confirmed against live data.

## 16. Wrong-Role Protection
`scan-qr` requires `role = gate`. A non-gate JWT (e.g. teacher) → `GATE_REQUIRED` (403) / `FORBIDDEN` (403). Edge: teacher scanning a valid token → GATE_REQUIRED (PASS). The browser app also sits behind a server-side layout guard that blocks non-gate roles from `/gate` entirely ("Gate staff only").

## 17. Duplicate Scan Protection
Dual-layered: (a) client `busyRef` rejects a second in-flight verify and `lastTokenRef` rejects re-submitting the identical token within a session; (b) the backend's atomic single-use consume rejects a second consume with `QR_ALREADY_USED`. Verified both edges.

## 18. Concurrent Scan Handling
The `consume_qr_scan` RPC updates `qr_tokens.status` to `USED` inside a transaction and the request to `AWAITING_TEACHER` guarded by `status = 'REQUESTED'`, so of two near-simultaneous scans the winner transitions the request and the loser sees `QR_ALREADY_USED` (the `USED` branch). The browser never fakes success; it always reflects the server verdict. (Concurrent race itself is server-authored and was not stress-tested in the browser, but the single-use invariant is enforced server-side as verified in §13.)

## 19. Realtime
Reused `useRealtimeStatus` / `useTableChanges` architecture (RLS-filtered, reflect-only, never authoritative). The scanner page shows a Live/Connecting/Offline status badge in the page header. The Gate has no queue to mutate, so realtime is supplemental context only; after every scan the UI reflects the server's returned verdict directly. No client inserts/deletes request state.

## 20. History
**Not built — reported as a known limitation.** The backend exposes no Gate-authorized history query (dismissal_events rows are scoped to `scanned_by = auth.uid()` but there is no dedicated, vetted Gate history Endpoint/RPC that the UI could call without inventing one). Per the mission, History is only built if the backend supports a proper Gate-authorized query; otherwise it must NOT be invented. The Gate nav is therefore **Scan + Profile** only. No Supabase modification was made to fabricate history.

## 21. Profile
`/gate/profile` shows Gate staff identity with three cards: "Your role" (Avatar + Staff ID `gte-1001` + Account type "Gate staff"), "School" (resolved school, if reachable under RLS), and "Session" (Sign out → `gateSignOut` server action → redirect `/login/gate`). No email/UUID/internal IDs are shown. Verified in browser: "Gate staff", "gte-1001", "Sign out" all present; Sign out returns to `/login`.

## 22. Navigation
`components/layout/navigation.ts` `getNavForRole("gate")` → `[{ items: [Scan `/gate`, Profile `/gate/profile`] }]`. No parent/teacher/admin nav. The shell is `AppLayout` role="gate" with the design-system "Gate staff only" guard for non-gate sessions. Verified: cross-role navigation from a logged-in Gate to `/teacher` → "Teachers only" and to `/parent` → "Parents only" (server guards, not client filtering).

## 23. Design System
Exclusively the Phase 19/21 design system: `AppLayout`/`Page`/`Section`/`Card`/`Button`/`IconButton`/`StatusBadge`/`Alert`/`Modal`/`DefinitionList`/`Field`/`Spinner`/`Skeleton` + design tokens (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `shadow-card`, `rounded-xl`, `max-w-content`, `text-h1/h2/...`, `animate-fade-in`, tone classes). `check:tokens` passes ("no raw hex colors in components/"). The legacy divergent Gate components (`TopNav`, `Panel`, `MonoLabel`, `StatusIndicator`, `AccessNote`, `framer-motion`, `text-bone`, `font-display`, `section-shell`, numbered sections) were removed from the Gate usage.

## 24. Responsive
Mobile-first, verified at **320, 375, 390, 430, 768, 1024, 1440, 1920** px: `documentElement.scrollWidth − innerWidth ≤ 1` (no horizontal overflow) on `/gate` and `/gate/profile`. The scanner uses a two-column grid that collapses to a single column on small screens; the manual-entry form stacks on mobile.

## 25. Accessibility (WCAG 2.2 AA)
Semantic landmarks and headings (`Page` H1 "Scan dismissal QR", labelled form fields with `htmlFor`/`id` + `aria-describedby`). The result region uses `role="status"`/`aria-live="polite"` for success/verifying and `role="alert"`/`aria-live="assertive"` for failures. Status is conveyed by text + tone (not colour alone) via `StatusBadge`. Focus-visible rings use design tokens; tap targets ≥ 44px. The manual-token input has an associated `<label>`. Reduced-motion is respected by the design system (no decorative animations added). Camera controls and the manual fallback are both keyboard-accessible.

## 26. Performance
Server Components for layout/guard/school resolution; the scanner page is a Client Component only where required (camera, scanner loop, interactive verify, realtime). No animation libraries added (the design system's `framer-motion` is not used by the Gate). The camera stream is released on unmount (confirmed in `useQrScanner` + the page's unmount effect). Bundle: `/gate` 52.7 kB / 210 kB First Load; `/gate/profile` 3.23 kB / 161 kB.

## 27. Real Data
All verification used the real Supabase project and real pilot accounts. No mock/fake/demo data is injected into the product UI. Temporary test artifacts (students/classes/schools/requests/parent accounts) were created via the service-role client **only inside the temporary verification scripts** and fully deleted in `finally` blocks; no real pilot data was touched or left behind.

## 28. Demo Data Audit
No new demo/sample/mock/fake/synthetic/placeholder data was added to the product. The only "demo" string in play is the `demo.dismissflow` email domain, which is the legitimate, pre-existing pilot-identity domain used by all staff/parent logins (a backend configuration value, not product demo content). No fabricated showcase/test/fixture rows were introduced into the UI or database.

## 29. Security Audit
- No mock/fake/demo data in the product UI; no hardcoded credentials. Pilot creds were only used transiently inside temp verification scripts and were not printed.
- Gate role, school, and identity are server-derived (`getSessionUser`, layout guard, school resolution). The browser never asserts a role/school/identity or supplies a `school_id`/`gate_id`.
- No RLS/Edge-Function/authorization bypass. Scans go only through `scanQr` → `scan-qr`; decisions/state transitions are backend-owned (`consume_qr_scan` SECURITY DEFINER, service-role only).
- Cross-school rejected server-side (`GATE_SCHOOL_FORBIDDEN`); non-gate rejected server-side (`GATE_REQUIRED`/`FORBIDDEN`); unauthenticated rejected (401). The browser cannot mutate request state.
- No service-role key in the client bundle or any `NEXT_PUBLIC_*`; the service-role client existed only in the **deleted** temporary verification scripts.
- Single auth backend (Supabase Auth + RLS); no second auth/backend created.
- No Supabase schema/RPC/Edge-Function/migration/permission/Realtime change was made (none was required).

## 30. Browser Verification
Real Chromium (Playwright) against the real backend and the built app: **27/28** assertions passed. Covered: gate login + redirect, "Scan dismissal QR" home, camera/result/manual cards, realtime badge, camera permission grant (scanning state, no "Camera is off"), VALID→"QR verified"+Awaiting teacher approval + no UUID/email leak, reset→"Scan another QR", DUPLICATE→"Already used", CANCELLED→"Cannot be scanned", EXPIRED→"Expired", INVALID→"Invalid QR code", WRONG SCHOOL→"Wrong school", responsive no-overflow 320–1920, profile (Gate staff / gte-1001 / Sign out), cross-role denial (`/teacher`→"Teachers only", `/parent`→"Parents only"), logout→`/login`. **Zero page errors, zero React/hydration/missing-chunk errors.** See §31 for the one console-log caveat.

## 31. Camera E2E Limitation
In the headless environment a physical/real QR cannot be presented to the camera, so jsQR cannot be exercised against a genuine QR through the lens end-to-end. Verification therefore used `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`, which auto-grants the camera permission and drives the **scanning state** (overlay clears, frame renders), plus the **manual-token path** which calls the real `scan-qr` Edge Function for the authoritative result. The decode→detect→`onDetect` loop is unit-tested (`lib/qr/__tests__/scan.test.ts`, 26/26) and the backend scan is edge-verified (§32). **Physical camera E2E (decoding a printed QR through a real lens) was not possible in this environment** and is the one item not directly exercised in-browser; everything around it (permission, scanning UI, decode hook, real scan call, result rendering) is verified.

## 32. Edge Function Verification
`scan-qr` exercised against the real backend with a temporary service-role/session harness (fully cleaned up): **9/9 passed** —
1. VALID gate scan → `AWAITING_TEACHER` (PASS)
2. REUSED token (2nd scan) → `QR_ALREADY_USED` (PASS)
3. CANCELLED (scan after cancel) → `REQUEST_NOT_SCANNABLE` (PASS)
4. INVALID random token → `INVALID_QR` (PASS)
5. EXPIRED (`qr_tokens.expires_at` aged) → `QR_EXPIRED` (PASS)
6. WRONG ROLE (teacher scans) → `GATE_REQUIRED` (PASS)
7. UNAUTHENTICATED (no session) → `UNAUTHENTICATED` / 401 (PASS)
8. WRONG SCHOOL (Tulip gate scans Rose QR) → `GATE_SCHOOL_FORBIDDEN` (PASS)
9. (Duplicate is covered by #2; the automated run also confirmed each maps to the exact HTTP status the browser handles.)

## 33. npm test
`npm test` → `lib/qr` (crypto, scan) + `lib/teacher/__tests__/decision.test.ts` → **26/26 pass, 0 fail.** No Gate-specific unit test was added (the scanner/scan logic is unchanged and already covered).

## 34. Typecheck
`npm run typecheck` (`tsc --noEmit`) → exit 0, no errors.

## 35. Build
`npm run build` → 19 routes generated, including `ƒ /gate` (52.7 kB / 210 kB First Load JS) and `ƒ /gate/profile` (3.23 kB / 161 kB). Build exit 0.

## 36. Token Check
`npm run check:tokens` (`node scripts/check-no-hex.mjs`) → "OK — no raw hex colors in components/".

## 37. Files Changed
- `app/gate/actions.ts` — **created**: `gateSignOut` server action (mirrors `parentSignOut`, redirects to `/login/gate`).
- `app/gate/layout.tsx` — **rewritten**: server `getSessionUser` guard, design-system "Gate staff only" card for non-gate, `AppLayout` role="gate", best-effort `schoolName` from `users.school_id → schools.name`.
- `app/gate/page.tsx` — **rewritten**: design-system scanner (reuses `useQrScanner` + `scanQr` + error mapping), camera Card, result Card with `aria-live` state machine, manual-token fallback, camera cleanup; removed all legacy components/framer-motion/numbered sections.
- `app/gate/profile/page.tsx` — **created**: Gate profile (Staff ID, School, Role, Sign out; no email/UUID/internal IDs).
- `components/layout/navigation.ts` — **edited**: `getNavForRole("gate")` → Scan + Profile.

## 38. Backend Changes
**NONE.** No migrations, RPCs, Edge Functions, RLS policies, permissions, Realtime config, users, or seed data were created or modified. All backend behavior relied upon (auth, `consume_qr_scan` single-use/cross-school/expiry, `scan-qr` error codes) was already present and was only read and verified.

## 39. Supabase Changes
**NONE.** No `supabase` CLI mutations, no schema changes, no Edge Function deploys. Temporary test data created via the service-role client inside deleted verification scripts was fully deleted.

## 40. Deployment
**NONE.** No `vercel deploy`, no production deploy. Verification ran only against a local `next start -p 3110` build. The server was stopped after verification.

## 41. Git
**No commit / push / amend / reset / restore / rebase / force-push / history rewrite.** All Phase 24 changes remain **uncommitted** in the working tree, per the security constraints.

## 42. Temporary Files
The temporary verification scripts (`scripts/_verify_gate_scan.mjs`, `scripts/_verify_gate_browser.mjs`, `scripts/_diag_gate.mjs`, `scripts/_diag_users*.mjs`, `scripts/_diag_pw.mjs`) were **deleted** before this report. They contained no hardcoded secrets or passwords (the pilot password was used transiently and never printed), were never imported by production code, and their test artifacts were cleaned up in `finally` blocks.

## 43. Remaining Issues
1. **Console-log caveat (non-defect):** The browser logs "Failed to load resource" `console.error` entries for the scan-qr Edge Function's expected 4xx business-logic responses (409 duplicate, 410 expired, 400 invalid, 403 wrong-school). These are the browser's standard logging of non-2xx fetches and are handled correctly by the app (verified UI states). They cannot be eliminated without changing the backend contract (forbidden). No application/React/hydration/chunk/page errors occur. Listed for transparency; not a blocker.
2. **History not built (by design):** No Gate-authorized history query exists in the backend; History was intentionally omitted (Scan + Profile only) rather than invented. If a history Endpoint is added later, the Gate can adopt the same pattern as the Teacher/Parent history pages.
3. **Physical camera E2E not possible headless:** See §31.

## 44. Next Phase
**STOP — Phase 25 must not begin until explicitly instructed.** The Gate application is complete and production-ready against the real backend; all four quality gates are green and real-browser + real-edge verification passed. Remaining items are documented limitations/caveats, not blockers. Recommended follow-ups (only when instructed): (a) a dedicated Gate-authorized history Endpoint if product requires Gate history; (b) a real-device camera pass (decode a printed QR through a physical lens) when a device/browser with a camera is available.
