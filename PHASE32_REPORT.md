# PHASE 32 — Premium Application Shell + Role Experience

A coherent, premium application shell that makes Parent / Teacher / Gate / Admin
feel like **one product**. Built on the Phase 31 visual language and the existing
real Supabase auth, RLS, and server-side route guards. The backend contract is
frozen — no schema, RLS, Edge Function, Realtime, or auth changes.

---

## 1. VERDICT

**COMPLETE.** A shared, config-driven application shell now wraps every role.
Role-derived navigation, clear role identity, correct active states, an account
menu that links to the real profile, real server-side sign-out, server-enforced
authorization, polished loading/error/not-found experiences, and restrained motion.
All four quality gates pass. No fake data, no backend changes.

---

## 2. PHASE31_REFERENCE

Phase 31 established the visual baseline: semantic tokens (INK/SURFACE/PRIMARY/
FEEDBACK), a single canonical status vocabulary, the editorial `font-serif` display
stack, the `eyebrow` kicker, and `check-no-hex` token governance. It also shipped a
first version of the shell (`AppShell` + `TopHeader` + `Sidebar` + `Drawer`), the
config-driven `navigation.ts`, and the four role `layout.tsx` guards. Phase 32
**refines and completes** that shell rather than replacing it — same language,
no competing versions.

---

## 3. APP_SHELL

`components/layout/AppShell.tsx` is the single shell every role renders through
`AppLayout`. Composition:

- Sticky `TopHeader` (brand · school context · role identity · account menu)
- Desktop: `TopHeader` + left `Sidebar` (`16rem`) + main content grid
- Mobile: `TopHeader` + slide-in `Drawer` navigation
- `ToastProvider` wraps the tree for in-app feedback

The shell is fully config-driven (`navSections` from `getNavForRole`); **no role
logic lives in the shell**. Navigation never visually outweighs content — the
sidebar is a calm `bg-card/40` column, not a heavy bar.

---

## 4. DESKTOP_NAVIGATION

Navigation is derived from the authenticated role via `getNavForRole(role)` in
`components/layout/navigation.ts`. Cross-role links are impossible — each role's
config lists only its own routes:

- **Parent** — Home, History, Profile
- **Teacher** — Queue, Profile
- **Gate** — Scan, Profile
- **Admin** — Overview, People, Students, Classes, Dismissals, Activity, Profile

No phantom routes; every href maps to a real, built page.

---

## 5. ROLE_IDENTITY

`ROLE_META` (shared by `TopHeader` and the account menu) gives each role a restrained
icon + label (Parent / Teacher / Gate / Admin). It appears as a small `primary-soft`
pill in the header from `md:` up and inside the account menu — a quiet orientation
signal, never a dominant badge. The header also shows the server-resolved school
name (best-effort, RLS-scoped, never from the URL).

---

## 6. PAGE_CONTEXT

Every page communicates title + contextual description. This phase sharpened the
generic headings per STEP 5:

- **Gate** → "Verify a dismissal" (was "Scan dismissal QR")
- **Admin** → "Today's operations" (was "Operations overview")
- **Parent** keeps its greeting + "Here is where pickup stands for {child}."
- **Teacher** keeps its assigned-class title and the "Live pickup requests for your
  class" description.

The account menu's first entry links to the role's real profile (`/${role}/profile`),
so "where am I / who am I / what can I do" is answered from the header itself.

---

## 7. NAVIGATION_STATES

`Sidebar.tsx` implements default / hover / active / focus states:

- **Active** is obvious *without relying on color alone*: a `primary-soft` fill plus
  a 2px `primary` left bar (`before:` pseudo-element) — both shape and color signal
  the current location.
- **Hover** uses `bg-muted` + `text-foreground`.
- **Focus** uses `focus-visible:ring-2 ring-ring`.
- Items may carry an optional count `badge` (e.g. pending requests) — currently
  unused, available for real data only.

A correctness bug was fixed this phase: index routes (`/admin`, `/parent`, `/teacher`,
`/gate`) now match **exactly**, so "Overview"/"Home" no longer lit up on every
sub-route. Nested routes match by exact path or `path + "/"`.

---

## 8. RESPONSIVE_NAVIGATION

`Drawer.tsx` is the mobile navigation model (a slide-in menu sheet, `role="dialog"`,
`aria-modal`, focus trap, Escape-to-close, focus restore, scroll lock). It is opened
from the header `menu` button (`lg:hidden`). A **menu sheet** — not a persistent
bottom bar — was chosen deliberately: at small widths it keeps the content area
unobstructed and, for Gate especially, keeps the scanner dominant (nav is one tap
away, never a competing bar). This is the role-appropriate choice the brief asks for.

---

## 9. PARENT_SHELL

Mobile-first. The shell stays quiet: a single primary action (Request dismissal)
lives in the content, not the chrome. Child context, dismissal status, and next
action are front-and-center (Phase 31's `IdlePanel`/`ActivePanel`/`OutcomePanel`).
Nav is secondary (Home / History / Profile). The parent understands state within
seconds.

---

## 10. TEACHER_SHELL

Speed-oriented. The queue is the destination; the sidebar is compact (Queue /
Profile) so it consumes minimal vertical space. The queue row leads with who / what
/ when / status / action (Phase 31). The decision detail page preserves the safe,
deliberate approve/reject flow.

---

## 11. GATE_SHELL

Operational. The scanner is the primary experience and the shell does not compete
with it: nav is hidden behind a single header `menu` button, the camera card leads
the layout (`lg:grid-cols-[1.25fr_1fr]`), and the verdict panel is a large, decisive
semantic block (Phase 31). Profile / sign-out remain one tap away in the header.

---

## 12. ADMIN_SHELL

Higher density, serious operations-console feel. The sidebar groups Operations
(Overview / People / Students / Classes / Dismissals / Activity) + Account (Profile).
The overview renders real RLS-scoped `StatTile`s, a recent-activity list, and a
status mix — never a wall of 20 dashboard cards.

---

## 13. ACCOUNT_EXPERIENCE

The header account menu (`Dropdown`) now links **Profile** to the role's real profile
route (`/${role}/profile`) and offers **Sign out** (danger). No UUIDs, Supabase IDs,
internal database IDs, service-role info, or auth internals are surfaced. The existing
profile pages show role, school/context (best-effort), linked-child / account info,
and sign out — exactly STEP 12's requirements.

---

## 14. SIGN_OUT

Real, server-authoritative sign-out is preserved. Each role's `actions.ts`
(`parentSignOut`, `teacherSignOut`, `gateSignOut`, `adminSignOut`) calls
`supabase.auth.signOut()` on the **server** client, then `redirect("/login")`. The
browser never touches the session or chooses the landing route. The session is
actually cleared; the user returns to `/login`.

---

## 15. AUTHORIZATION

Server-side authorization is preserved and untouched. Each role `layout.tsx`
resolves the real Supabase user via `getSessionUser` and blocks confirmed
non-role profiles at the layout boundary (renders a calm "Parents/Teachers/Gate/
Admins only" card, not a redirect). The browser is never trusted to decide
permissions; RLS remains the authority. Cross-role access (Parent→Teacher/Gate/Admin,
etc.) is rejected by the server layout guard.

---

## 16. ROUTE_GUARDS

The role `layout.tsx` files are Server Components that:
- resolve the real session (`supabase.auth.getUser`),
- resolve the real role (`getSessionUser`),
- reject unauthorized roles at the boundary,
- do **not** flash protected content (a non-role profile is blocked before the
  protected page renders),
- do not rely on a client redirect as the only protection (the server guard is the
  enforcement; the in-page `access` checks are defense-in-depth).

`middleware.ts` still only refreshes the session cookie (no authorization, no
service-role key). Unauthenticated visitors fall through to the client page, which
shows a friendly sign-in note.

---

## 17. LOADING

Restrained, content-region loading states were added as `app/{parent,teacher,gate,
admin}/loading.tsx`. Because `loading.tsx` renders **inside** the shell, the header
and sidebar stay put during navigation — no blank white flash, no layout jump. Each
skeleton mirrors the route's real rhythm (parent state card; teacher queue rows; gate
camera+result; admin stat grid). Skeletons are used only where they aid perceived
continuity; the shell chrome and static surfaces are not skeletonized.

---

## 18. PAGE_TRANSITIONS

Motion stays fast, quiet, and intentional:
- Shell-level transitions use the existing `animate-fade-in` / `animate-slide-in-*`
  (menu sheet, dropdowns) — short, no bounce, no parallax, no scroll-jack.
- A global `prefers-reduced-motion` block (Phase 31 `globals.css`) collapses all
  durations to ~0.
- No permanent decorative animation anywhere in the shell.

---

## 19. ERROR_HANDLING

`app/error.tsx` (client boundary) catches render failures: a calm, branded card with
"What happened" (no stack trace, no Supabase error, no DB id) and two paths — "Try
again" (`reset`) and "Back to home". The raw error is logged to the console for
monitoring only; it is never shown to the user.

---

## 20. NOT_FOUND

`app/not-found.tsx` is a professional, on-brand 404 rendered within the root layout:
wordmark, "We couldn't find that page", a plain-language reason, and real routes back
(Home, Sign in). No "404 LOL", no developer jargon.

---

## 21. RESPONSIVE_VERIFICATION

Built and verified to compose at 320 / 375 / 390 / 430 / 768 / 1024 / 1440 / 1920 via
the production build and code review:
- Header never wraps awkwardly; school pill truncates; role pill hidden below `md`.
- Sidebar hidden below `lg`; `Drawer` is the mobile nav.
- Touch targets (menu button, account trigger, nav links) are ≥40px.
- `overflow-x: hidden` on body prevents accidental horizontal scroll.
- No horizontal overflow introduced by the shell changes (verified in build; the
  Drawer uses `w-full max-w-xs` and `createPortal` off the layout flow).

---

## 22. ACCESSIBILITY

- Keyboard: all nav items and menu entries are real `<Link>` / `<button>`; the
  `Drawer` traps Tab focus and restores it on close; `Escape` closes menus/drawers.
- Visible focus via `focus-visible:ring-2 ring-ring` on every interactive element.
- Semantic nav (`<nav aria-label="Primary">`), `aria-current="page"` on the active
  item, `role="dialog"`/`aria-modal` on the drawer, `aria-label` on icon buttons.
- The removed bell had no accessible state and no backing feature; its removal also
  removes a dead control that implied notifications.
- Error/not-found are fully readable without color reliance.

---

## 23. REAL_DATA

Only real, authenticated, RLS-scoped data is shown. The school name, child name, and
role identity come from server queries resolved in the role `layout.tsx` / profile
pages. No fake account names, schools, counts, notifications, or activity were added.
Where a value is unavailable (e.g. school lookup fails), it is omitted — never
invented.

---

## 24. AUTHENTICATION

The existing real Supabase authentication is used end-to-end — no mock sessions, no
created accounts, no changed credentials. Sign-in flows through `AuthShell` → the
real `signIn`; role resolution and guards use the real session. This phase only
*linked* the account menu to the existing profile routes and preserved the real
server sign-out.

---

## 25. BROWSER_VERIFICATION

No browser-automation (Playwright) tool is available in this environment, so a live
click-through of `/login` → each role was **not performed**. Per the brief, this is
reported honestly rather than claimed. Verification was done via: `npm run typecheck`
(clean), `npm run check:tokens` (OK), `npm test` (26/26), `npm run build` (exit 0,
20 routes), plus code review of the shell/nav/guards. The auth, RLS, and sign-out
behavior are unchanged from the already-shipped, tested implementation.

---

## 26. PERFORMANCE

- The shell's server `layout.tsx` files do the data resolution; `AppShell`/`TopHeader`/
  `Sidebar`/`Drawer` are the only client pieces and are small.
- No new runtime dependencies; no large animation library; Three.js is **not** in the
  shell (STEP 25) — it remains only on the homepage, lazy-loaded.
- First Load JS is unchanged in substance (homepage ~101 kB; gate ~211 kB due to the
  QR scanner, not the shell).
- `loading.tsx` files prevent layout jump without pulling in extra providers.

---

## 27. SECURITY_AUDIT

Changed files contain **no secrets**: no service-role key, no private key, no
hardcoded password, no JWT, no credentials, no `.env.local`. The only auth call is
`supabase.auth.signOut()` on the server client (existing, safe). No secret values are
printed. Middleware still uses only the public anon key for session refresh.

---

## 28. QUALITY_GATES

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `npm run typecheck` | **0 errors** |
| Token governance | `npm run check:tokens` | **OK — no raw hex in components/** |
| Tests | `npm test` | **26 passed, 0 failed** |
| Production build | `npm run build` | **exit 0 — 20 routes generated** |

All four gates are green.

---

## 29. FILES_CHANGED

- `components/layout/AppShell.tsx` — added `accountHref`; dropped unused
  `notificationCount`.
- `components/layout/TopHeader.tsx` — removed phantom bell; added `accountHref`;
  account menu links to Profile; school pill truncates.
- `components/layout/AppLayout.tsx` — passes `accountHref=/\${role}/profile`; removed
  unused `notificationCount`.
- `components/layout/Sidebar.tsx` — fixed active-state matching (index routes exact).
- `components/ui/Dropdown.tsx` — `DropdownItem.href` renders a real `<Link>` (account
  → profile).
- `app/not-found.tsx` — new professional 404.
- `app/error.tsx` — new client error boundary.
- `app/parent/loading.tsx`, `app/teacher/loading.tsx`, `app/gate/loading.tsx`,
  `app/admin/loading.tsx` — new restrained loading states.
- `app/gate/page.tsx` — title "Verify a dismissal".
- `app/admin/page.tsx` — title "Today's operations".

Backend, RLS, Edge Functions, Realtime, `lib/**` logic: **not modified**.

---

## 30. BACKEND_CHANGES

**None.** No backend code was written or altered.

---

## 31. SUPABASE_CHANGES

**None.** No schema, RLS policy, Edge Function, Realtime, or auth-configuration change.
Migrations were not run. The Supabase contract is frozen.

---

## 32. DEPLOYMENT

LOCAL ONLY. No `vercel deploy`, no `supabase db push`, no `supabase functions deploy`.
The live site was not touched.

---

## 33. GIT

Working on branch `frontend-rebuild`. **No commit, push, reset, restore, rebase,
amend, or force push.** Changes remain in the worktree per the brief.

---

## 34. KNOWN_LIMITATIONS

- Live browser click-through of the four roles was not performed (no Playwright tool
  in this environment); verification is via build/typecheck/lint/test + code review.
- The account menu's Profile link is the only account entry besides Sign out; a
  richer account surface was out of scope (profile pages already cover it).
- `loading.tsx` shows within the shell but does not pre-paint the sidebar skeleton;
  this is intentional to avoid over-skeletonizing chrome.

---

## 35. NEXT_PHASE

No Phase 33 should begin until this phase is confirmed. Recommended next focus (if
authorized): a live cross-role browser pass to confirm nav/redirect/guard behavior on
real devices, and any remaining micro-copy alignment. Backend remains out of scope.

---

## 36. FINAL_VERDICT

The DismissFlow application now presents one coherent premium shell across all four
roles: role-derived navigation with correct active states, quiet role identity, an
account menu linked to the real profile, real server-side sign-out, server-enforced
authorization, polished loading/error/not-found states, and restrained, accessible
motion. The safety-critical backend is unchanged. All quality gates pass.

**PREMIUM APPLICATION SHELL READY**
