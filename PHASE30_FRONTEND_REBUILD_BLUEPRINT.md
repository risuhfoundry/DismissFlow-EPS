# PHASE 30 — DismissFlow EPS Frontend Rebuild Blueprint

**Status:** Audit + UX research + visual direction + architecture + implementation blueprint.
**Rule honored:** No application source modified. No backend/Supabase/RLS/Edge Function/Realtime changes. No deploy, commit, or push. This document is the only deliverable.
**Repo audited:** `D:\Projects\DismissFlow EPS\.claude\worktrees\chamgadar` (branch `worktree-chamgadar`).
**Audit method:** 6 parallel read-only sub-agents (architecture/config/tokens, route map/layouts/nav, backend contract/auth, data model/journeys, current UX/UI primitives, 3D/motion/tests/perf), synthesized here.

---

## 1. VERDICT

**FRONTEND REBUILD BLUEPRINT READY.**

The repository was thoroughly audited (all 24 steps). The proposed architecture, UX critique, visual language, Three.js strategy, migration plan, and testing strategy are coherent. Two environment limitations were encountered and are documented honestly (Section 20, 21, 44):

- **Stitch MCP was not available** in this environment, so live visual generation could not be run. Visual direction was derived from code + the shipped token system + the `impeccable` / `apple-design` / `emil-design-eng` lenses.
- **The "Taste" skill was not available**; the same role was filled conceptually by the `impeccable` (UX critique) and `apple-design` (restraint/precision) lenses.

One **stakeholder-facing decision** is resolved in this blueprint with explicit reasoning: **do not adopt Three.js / React Three Fiber** (Section 17–19). Every candidate surface is either explicitly forbidden by the brief (login, forms, dense admin tables, profile, operational data screens) or would be decorative/harmful (public hero, parent QR, teacher decision, gate scanner). The product's calm, server-authoritative, status-driven nature has no genuine 3D purpose.

---

## 2. CURRENT PROJECT ARCHITECTURE

- **Framework:** Next.js **14.2.35**, App Router, TypeScript 5.6.2, React 18.3.1, Tailwind 3.4.13. (`package.json:23-35`)
- **Supabase:** `@supabase/ssr` 0.5.2 + `@supabase/supabase-js` 2.45.4. Browser client (anon key) + server client (anon key + cookies). Service-role key used **only** inside Edge Functions, never in the app bundle. (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
- **Auth:** email/password with a *derived* email (`<loginId>@<domain>`). Role lives in `public.users.role`, resolved server-side via `SECURITY DEFINER` helpers (`app_role()`, `app_school_id()`). Not a JWT claim. (`lib/auth/*`, `supabase/migrations/0001_init.sql`, `0015_school_tenant_model.sql`)
- **Mutations:** all writes go through 6 Edge Functions (`create-dismissal-request`, `cancel-dismissal`, `scan-qr`, `approve-dismissal`, `reject-dismissal`, `manage-identity`). Next.js **server actions exist only for sign-out**. (`lib/dismissal/client.ts`, `app/*/actions.ts`)
- **Realtime:** `lib/realtime/subs.ts` — `useRealtimeStatus` (probe channel) + `useTableChanges` (postgres_changes, RLS-filtered server-side). Used by parent/teacher/gate/admin.
- **Animation:** `framer-motion` 12.x is **declared but entirely unused** (zero imports). All motion is Tailwind keyframes + CSS transitions, with a global `prefers-reduced-motion` kill-switch. (`package.json:20`, `tailwind.config.ts:168-184`, `app/globals.css:105-114`)
- **QR:** `react-qr-code` (SVG render) + `jsQR` (camera decode via a hidden 2D `<canvas>`). Token = 43-char base64url, 256-bit CSPRNG; DB stores only SHA-256 hash. (`lib/qr/*`, `supabase/functions/create-dismissal-request/crypto.ts`)
- **3D:** **none.** No `three`, `@react-three/fiber`, `WebGL`, or `Canvas` (r3f) anywhere in source.
- **Middleware:** `middleware.ts` only (a) refreshes the Supabase session cookie and (b) blocks `/foundation` in production. It performs **no** route protection or role logic.
- **Docs drift:** `README.md` and `Docs/design/README.md` describe a stale dark "Revora/Kernel" aesthetic (Lenis, cursor glow, Barlow Condensed) that was removed (Phase 18). The shipped system is a calm **light** theme. These docs must be updated in the rebuild.

---

## 3. CURRENT FRONTEND MAP

**Public**
| Path | File | Type | Notes |
|---|---|---|---|
| `/` | `app/page.tsx` | Server Component | Landing; renders client `PublicNav`. |
| `/login` | `app/login/page.tsx` | Client | Parent sign-in (`AuthShell` role=parent). |
| `/login/teacher` `/login/gate` `/login/admin` | `app/login/[role]/page.tsx` | Client | Staff sign-in (only `teacher\|gate\|admin`). |
| `/foundation` | `app/foundation/page.tsx` | Client | Dev-only design-system showcase; 404 in prod. |

**Parent** (layout `app/parent/layout.tsx` → `AppLayout` → `AppShell`): `/parent`, `/parent/history`, `/parent/profile`.
**Teacher**: `/teacher`, `/teacher/[requestId]`, `/teacher/profile`.
**Gate**: `/gate`, `/gate/profile`.
**Admin**: `/admin`, `/admin/people`, `/admin/students`, `/admin/classes`, `/admin/dismissals`, `/admin/activity`, `/admin/profile`.

All role pages are Client Components; all role layouts are Server Components that resolve the session and render a shared `AppShell`. Full inventory with file:line in audit agent 2. Every expected route is present; no missing/extra routes.

---

## 4. BACKEND CONTRACT MAP

**Tables touched (frontend column lists verbatim from code):**
- `users` (`user_id, role, login_id, credential_status, linked_student_id, assigned_class_id, school_id`)
- `students` (`student_id, name, admission_no, gender, dob, class_id, school_id`)
- `classes` (`class_id, class_name, section, teacher_id, school_id`)
- `guardians` (`name, phone`) via `student_guardians` join
- `student_guardians` (`guardian_id, student_id`)
- `dismissal_requests` (`request_id, student_id, status, created_at, updated_at, expires_at`)
- `dismissal_events` (`event_id, request_id, student_id, scanned_by, approved_by, scan_time, approval_time, final_status, created_at`)
- `schools` (`school_id, name`) — **no RLS** (see Section 35 risk)
- `qr_tokens` — **never read by the UI**; RLS-denied to anon/authenticated.

**Edge Function contracts (`lib/dismissal/client.ts`):**
- `create-dismissal-request` → `{request_id, token, expires_at}` (parent)
- `cancel-dismissal` → `{success, status, request_id, student_id}` (parent)
- `scan-qr` → `{valid, status:"AWAITING_TEACHER", student:{name,class}}` | `{valid:false, code, message}` (gate)
- `approve-dismissal` → `{success, status:"DISMISSED", ...}` (teacher)
- `reject-dismissal` → `{success, status:"REJECTED", ...}` (teacher)
- `manage-identity` → identity lifecycle (admin)

**Trusted service-role RPCs (called inside Edge Functions):** `consume_qr_scan` (atomic single-use scan), `teacher_decide_request` (role/class re-check + transition), `parent_cancel_request`. All EXECUTE revoked from anon/authenticated; granted to service_role only.

**RLS dependency:** tenant isolation is 100% RLS-driven (`school_id = public.app_school_id()` in `0017_tenant_scoped_rls.sql`). No frontend query passes a `school_id` filter on tenant data — correct by design.

---

## 5. AUTHENTICATION MAP

- **Parent login** (`lib/auth/parent-login.ts`): `signInWithPassword({ email: <admissionNo>@<domain>, password })`.
- **Staff login** (`lib/auth/role-login.ts`): `signInById(role, loginId, password)` → same `signInWithPassword` with derived email. One real Auth account per person (Phase 17 per-person model); password = `login_id`.
- **No magic link / OTP** anywhere.
- **Session resolution** (`lib/auth/session.ts:34-57`): `auth.getUser()` → `users` row (`role, linked_student_id, assigned_class_id`). Returned to every page + layout, guarded with `isParent/isTeacher/isGate/isAdmin`.
- **Role/school resolution:** DB-derived, server-authoritative. The JWT carries **no** role/school claim. Edge Functions re-derive and enforce.
- **Route guards:** layered, **not** middleware-enforced.
  1. Each role **layout** (Server Component) blocks *confirmed* wrong-role users with a static "X only" message + link home — **no `redirect()`**.
  2. Each **page** re-checks role in its load effect and shows an `AccessNote`/`Alert`. Coverage is inconsistent: **`/gate` has no client-side guard**; parent/teacher/admin pages do.
  3. `AuthShell` post-sign-in re-check signs the user out if the resolved role ≠ portal role.
- **Logout:** per-role server action `*SignOut` → `auth.signOut()` → `redirect("/login*")`.
- **Wrong-role behavior:** inline message + link; never a hard redirect. Acceptable UX but inconsistent with the rest of the system (and unauthenticated users still receive shell chrome before the client note appears).

---

## 6. REAL DATA MAP

**Parent:** linked `student` (name, admission_no, class), one active `dismissal_requests` row (`REQUESTED`|`AWAITING_TEACHER`), `qr_token` (held in React state only — lost on remount), `history` (last 50 requests: status + dates, no student name/class), `profile` (child, class, school).
**Teacher:** assigned `class`, queue of `dismissal_requests` filtered `AWAITING_TEACHER`, request detail (`student`, `guardian` name/phone, `dismissal_events.scan_time`), decision result.
**Gate:** no direct table reads — only the `scan-qr` verdict (`student.name`, `student.class`). Never sees request_id/student_id/guardian.
**Admin:** counts (students/classes/users-by-role/requests-by-status), recent `dismissal_requests` (limit 100), `students` roster, `classes`, `users` (people), `dismissal_events` audit (limit 100). No email/password rendered; guardian PII deliberately omitted from student lists.

Full field lists with file:line in audit agent 4.

---

## 7. USER JOURNEYS

**Dismissal lifecycle (canonical):** `REQUESTED` (parent created, awaiting gate scan) → `AWAITING_TEACHER` (gate scanned) → `DISMISSED` (teacher approved) | `REJECTED` (teacher) ; plus `CANCELLED` (parent, only while `REQUESTED`) and `EXPIRED` (timer/token). Enums match DB exactly (`lib/dismissal/state.ts:6-13`).

**Parent:** sign in → dashboard → request → QR + countdown → (gate scan) realtime flips to `AWAITING_TEACHER` → teacher decision → final state → history.
**Teacher:** sign in → live queue (`AWAITING_TEACHER`) → detail → approve/reject → result (realtime to parent).
**Gate:** sign in → camera auto-starts → scan → verdict → next.
**Admin:** sign in → overview → people/students/classes/dismissals/activity → profile.

**Friction / bugs found (do NOT fix in Phase 30):**
1. **Lost QR on remount** — `qrToken` is memory-only (`app/parent/page.tsx:379,543`); returning to the dashboard shows a dead-end "cancel and request a new one" alert though the request is still valid.
2. **Wrong parent copy** — `AWAITING_TEACHER` labelled "Approved / teacher approved the pickup" (`lib/dismissal/status-meta.ts:20-24`) when the teacher has **not** acted; the `REQUESTED` next-step copy says "waiting for the teacher" but the next actor is the **gate**.
3. **Swallowed cancel error** — `app/parent/page.tsx:565-571` sets `error` but renders it only in the idle branch (`:659`), never while active.
4. **Dead `queueError`** in teacher queue (declared `:70`, never set).
5. **Admin "Status mix" + recent list bounded by `limit 100`** read as school-wide but are not (`app/admin/page.tsx:134-138,299-310`).
6. **Admin activity filter** exposes non-terminal statuses that `final_status` never holds (`app/admin/activity/page.tsx:211-215`).
7. **`schools.limit(1)` multi-tenant correctness bug** in `app/parent/profile/page.tsx:62-66` (no `school_id` filter, no RLS — returns an arbitrary school in multi-tenant).

**Status-label fragmentation (key finding):** the same `AWAITING_TEACHER` state is labelled four different ways — "Approved" (parent), "Awaiting teacher" (admin), "Awaiting your decision" (teacher), "Awaiting teacher approval" (gate). One source of truth required (Section 9, 14).

---

## 8. CURRENT UX AUDIT

**Strengths:** Strong, accessible primitives — `Modal` (full focus trap + restore), `PasswordInput` (exemplary a11y toggle), `DataTable` (typed, loading/empty), `Toast` (live region), `Alert` (role alert/status), `Icon` (one consistent inline-SVG set, `aria-hidden`), `AuthShell` (role-aware, `aria-describedby`), `Button` (`aria-busy` + loading). Correct heading ladder, semantic landmarks, global reduced-motion. State presentation is a clear strength.

**Weaknesses (inventory discipline, not quality):**
- **~10 dead/orphaned components:** `ui/AccessNote`, `ui/Panel`, `ui/Stat`, `ui/StatusPill`, `ui/PageHeader`, `ui/StatusIndicator`, `ui/LiveBadge`, `ui/VersionTag`; plus unused `layout/PublicLayout.tsx`, `ui/TopNav.tsx`.
- **3 status-dot mechanisms** (`StatusBadge pulse`, `StatusIndicator`, `LiveBadge`/`LiveDot`) — only tinted `StatusBadge` ships.
- **2 stat components** (`ui/Stat` vs `app/admin/_ui.tsx` `StatTile`).
- **2 `AccessNote`s** (`ui/` vs `app/admin/_ui.tsx`).
- **Copy-pasted button styles** in `LinkButton` (duplicates `Button` BASE/SIZES/VARIANTS).
- **Over-uppercasing** — `eyebrow`/uppercase-tracking micro-labels are near-ubiquitous (Field, CardHeader, SectionLabel, Stat, Sidebar, Divider). The single biggest stylistic "busy" signal.
- **Equal-weight card stacks** — admin overview is a stack of same-weight bordered white boxes; hierarchy leans entirely on spacing + small-caps.
- **Contrast risk** — `text-warning #B7791A` on `bg-warning-soft #FBF3E2` likely <4.5:1 at 12px; `muted-foreground #697586` tight at 12px; `info #0E84B4` vs `primary #2C56D6` chromatically close.
- **Drawer has no Tab trap** (Modal does) — asymmetry.
- **Touch targets** — `IconButton sm` 32px < 44px guidance.
- **Raw `<input>` in `app/gate/page.tsx:296-305`** diverges from the `Input` primitive.

KEEP/REDESIGN/SIMPLIFY/REMOVE/REPLACE matrix in audit agent 5 (Section 7). **Net:** the design *system* is good; the *library hygiene* and a few UX bugs are the real work.

---

## 9. INFORMATION ARCHITECTURE

**Principle:** keep the four-portal structure; fix the *labeling* and *surface-weight* problems; unify status into one vocabulary.

For every major screen define (example — PARENT dashboard):
- **Primary user:** parent. **Primary goal:** know pickup status + act (request/cancel). **Primary action:** Request dismissal (when idle) / Show code (when active). **Secondary:** History, Profile. **Critical info:** child, current status, QR (active), countdown. **Secondary:** school, realtime indicator. **Loading:** skeleton child card + QR. **Empty:** idle CTA. **Error:** inline `Alert` (cancel failure now swallowed — fix). **Success:** `OutcomePanel`.

**Proposed IA changes:**
- One **status vocabulary module** (`lib/dismissal/status-meta.ts` becomes the single source; `state.ts` labels folded in; teacher/gate inline strings removed). Labels must be *factually correct per actor* (parent at `AWAITING_TEACHER` = "Scanned — awaiting teacher", not "Approved").
- **Surface-weight hierarchy:** primary surfaces = bordered `card`; supporting tiles (stat tiles, secondary panels) = flat `surface-subtle` (no border/shadow). Reduces the "stack of white boxes" feel.
- **Reserve small-caps** for true eyebrows/section kicks; most labels become normal-case muted `text-sm`/`text-xs`.
- **Combine** where natural: parent dashboard idle + active are one screen with state-driven body; admin overview stat groups collapse into one scored `surface-subtle` band.
- **Shared UI** that belongs in `components/ui`: a single `StatusBadge` (tinted, dot+pulse), a single `StatTile`, a single `AccessNote`, a `buttonStyles` util shared by `Button` + `LinkButton`.

---

## 10. DESIGN DIRECTION

**One coherent DismissFlow visual language = the shipped calm light theme, refined.**

- **Preserve:** token-driven system, light `color-scheme`, Geist Sans/Mono, restrained indigo-blue primary, hairline borders, soft shadows, tinted status pills, global reduced-motion.
- **Refine (not redesign):** (a) differentiate surface weights, (b) cut over-uppercasing, (c) unify status language, (d) contrast pass, (e) delete dead components, (f) add Drawer focus trap, (g) 40–44px touch targets.
- **Feel:** quiet, confident, premium, professional. Premium from typography/spacing/alignment/restraint — never from effects.
- **Explicitly rejected:** neon, gloss, glass, cyberpunk, crypto, excessive gradients, glow, excessive blur/shadow/rounded/pills, card-in-card, clutter, giant type, bouncy/parallax/decorative motion, generic SaaS/dashboard templates, AI-slop.
- **Update stale docs** (`README.md`, `Docs/design/README.md`) to describe the real light system; delete references to Lenis/cursor-glow/Barlow.

---

## 11. COLOR STRATEGY

**Keep the current restrained palette (audit agent 1, Section 5a):**

| Token | Value | Role |
|---|---|---|
| `INK.primary` | `#0E1726` | headings/body |
| `INK.secondary` | `#3C4658` | supporting text |
| `INK.muted` | `#697586` | metadata/captions (contrast pass — see below) |
| `SURFACE.background` | `#F5F7FA` | app canvas |
| `SURFACE.card` | `#FFFFFF` | primary surface |
| `SURFACE.subtle` | `#EEF1F6` | recessed/supporting surface |
| `PRIMARY` | `#2C56D6` / hover `#2348B8` / active `#1D3C9B` / soft `#EEF2FE` | brand accent (sparing) |
| `success` | `#16864A` | positive |
| `warning` | `#B7791A` | caution (darken text or strengthen soft bg for AA) |
| `danger` | `#D23B3B` | error |
| `info` | `#0E84B4` | informational (separate hue from primary) |

**Rules:** neutral canvas, clean white surfaces, deep neutral type, muted secondary text, subtle 1px borders, restrained single brand accent, semantic status colors only. No neon/rainbow/bright gradients/glow.

**Required contrast fixes:** verify `warning` and `muted-foreground` at 12px against their backgrounds (target ≥4.5:1); separate `info` blue from `primary` blue so status pills aren't chromatically ambiguous for color-only users. Add a token-governance test so `globals.css` scrollbar/focus/selection hex also routes through tokens (extend `check-no-hex` to scan `app/globals.css`).

---

## 12. TYPOGRAPHY STRATEGY

**Fonts:** Geist Sans (UI/headings) + Geist Mono (codes/tokens/IDs only). Remove unused `@fontsource/geist-mono`. Load via `next/font` (already done — zero layout shift).

**Type scale (from `tailwind.config.ts:108-126`, keep + tune):**
- Display `clamp(2.25–3.25rem)` — landing hero only, used sparingly.
- H1 `1.875rem/700/-0.02em`, H2 `1.4375rem`, H3 `1.1875rem`, H4 `1.0625rem`.
- Body Large `1.0625rem`, Body `0.9375rem` (consider 1rem/16px for comfort), Body Small `0.875rem`, Caption `0.75rem`, Label `0.8125rem`.
- **Prioritize** readability, hierarchy, line-height (1.5–1.6 body), weight contrast, restrained letter-spacing.
- **Do NOT** use uppercase labels everywhere, monospace everywhere, or huge headings everywhere. Replace most `uppercase tracking-wide` micro-labels with normal-case muted labels; reserve small-caps for true eyebrows.
- Use `tabular-nums` for IDs, counts, timestamps (already done via `.tabular`).

---

## 13. SPACING STRATEGY

- Keep the 4px rhythm (Tailwind default) + existing extensions (`4.5=1.125rem`, `13=3.25rem`, `15=3.75rem`, `18=4.5rem`).
- Standard page container `max-w-content` (80rem) + `max-w-reading` (44rem) for prose.
- Establish a **consistent card padding** (e.g., `px-5 py-4` default; stop page-level `py-5` overrides) — current inconsistency noted in audit agent 5.
- Use generous vertical rhythm between Sections; tighter within a card. Differentiate surfaces by *weight* (border/shadow vs flat), not by padding tricks.
- 8px base gutter for icon+label gaps; 12–16px between related controls.

---

## 14. COMPONENT ARCHITECTURE

```
components/
  ui/            # shared primitives (collapse duplicates)
    Button, IconButton, LinkButton(shared styles)
    Input, PasswordInput, Textarea, Select, Checkbox, Radio, Label, Field
    Card (+Header/Content/Footer), StatTile (single), StatusBadge (single)
    Modal, Drawer(+TabTrap), Dropdown, Tooltip, Tabs
    Toast/ToastProvider, Alert, EmptyState, Skeleton, Spinner, Avatar, Icon, Divider
  layout/        # AppShell, AppLayout, TopHeader, Sidebar, Page, Brand, navigation
  auth/          # AuthShell (role-aware)
  marketing/     # PublicNav, LinkButton
  parent/ teacher/ gate/ admin/   # domain screens + shared domain helpers
  three/         # EMPTY — no 3D adopted (Section 17)
```

**Decisions:**
- Delete dead: `ui/AccessNote`, `ui/Panel`, `ui/Stat`, `ui/StatusPill`, `ui/PageHeader`, `ui/StatusIndicator`, `ui/LiveBadge`, `ui/VersionTag`, `layout/PublicLayout`, `ui/TopNav`.
- Merge: `Badge`↔`StatusBadge` (one component, `dot`+`pulse` props); `StatTile` is the single stat; one `AccessNote`; `buttonStyles` util shared by `Button`+`LinkButton`; `DataTable` composes `Th`/`Td`.
- One status vocabulary: `StatusBadge` tinted pill is the only status visual; realtime uses `StatusBadge pulse`.
- Avoid giant components; keep domain screens composed from `ui/` + `layout/`.
- Keep `Icon` as the single inline-SVG source (no icon font).

---

## 15. NEXT.JS ARCHITECTURE

- **Server Components by default.** Move read-only primary data fetching into Server Components where the RLS-scoped server client can resolve it (counts, rosters, history, overview). Today *all* pages fetch client-side in `useEffect` — the biggest perf opportunity.
- **Client Components** only for: forms, camera/scanner, realtime subscriptions, modals/drawers, interactive state.
- **Server Actions** for mutations that are safe server-side (sign-out already; optionally request/cancel/approve/reject could become server actions calling the Edge Functions — but the Edge Functions remain the authority; keep them as the call target).
- **Browser-only** components: `gate` scanner (`getUserMedia`), any `framer-motion`-free CSS animation. Isolate behind `"use client"`.
- **Realtime** components: keep `lib/realtime/subs.ts` hooks; wrap subscription setup in small client components; reflect-only (UI never decides status).
- **Three.js:** none (isolated boundary unnecessary).

---

## 16. SERVER/CLIENT BOUNDARIES

Current: layouts = Server (session resolve), pages = Client (data + realtime). Recommended evolution:
- Layouts resolve session **and** can prefetch the role's display context (already done best-effort) — keep.
- Add a **single** `withRoleGuard(role, children)` Server helper to replace the 4 duplicated role layouts.
- Add a **single** client `useRequireRole(role)` hook (or `<AccessGate>`) to replace the ~10 duplicated per-page guard blocks; fix the missing `/gate` guard.
- Prefer Server Component data fetch for lists/overview; pass serialized rows to thin client components for realtime/interrupt.
- Keep `middleware.ts` as session refresh; optionally add server-side `redirect()` for unauthenticated/wrong-role at the layout boundary for a cleaner UX (RLS remains the real enforcement — middleware redirect is UX only, never a security boundary).

---

## 17. THREE.JS STRATEGY

**Decision: DO NOT ADOPT Three.js / React Three Fiber.**

Reasoning (audit agent 6, Section E) — every candidate surface either violates the brief's explicit prohibitions or would be decorative/harmful:

| Surface | Purpose | 3D verdict | Why |
|---|---|---|---|
| Public landing | marketing/info | **NO** | decorative hero prohibited; would bloat bundle, contradict "calm/no noise" |
| Parent dashboard + QR | trust-critical, mobile-first | **NO** | QR must stay crisp/scannable; information-dense |
| Teacher queue/detail | latency-sensitive safety decision | **NO** | dense data + forms/actions prohibited |
| Gate scanner | real-time camera vision | **NO** | only "canvas" is 2D decode; 3D overlay would occlude scan area |
| Admin console | dense read-only tables | **NO** | explicitly forbidden (tables/forms) |

The product is a calm, server-authoritative, status/information-driven safety tool. There is **no genuine 3D purpose**. Adopting WebGL would add bundle/parse weight, risk gate-scan reliability, and break the "calm, no noise" contract.

---

## 18. THREE.JS LOCATIONS

**None recommended.** Explicitly exclude from: login, forms, dense admin tables, profile pages, operational data screens, public hero, parent QR, teacher decision, gate scanner. The `components/three/` directory is not created.

If a future stakeholder insists on a signature 3D moment, the *only* even-debatable candidate is a restrained public-landing hero — but that is itself prohibited by the brief's "no decorative 3D / no AI-slop" rule, so it is advised against. Resolve with stakeholder before any 3D work.

---

## 19. THREE.JS FALLBACK STRATEGY

Not applicable (no 3D adopted). **If** any 3D is ever added later: fallback = static CSS/SVG composition with full content/text parity; `three` loaded via `dynamic(() => import(...), { ssr:false })`; `prefers-reduced-motion` disables it; WebGL-unsupported devices get the static fallback; 3D must never be required to understand content (WCAG 1.4.1/1.3.1).

---

## 20. STITCH EXPLORATION

**Honest limitation:** Stitch MCP was **not available** in this environment, so live screen generation could not be executed. The following direction was derived from the code + shipped tokens + the `impeccable`/`apple-design` lenses, and should be re-validated with Stitch in a Phase where the MCP is provisioned.

**Per-screen direction (analysis-based):**
1. **Public landing** — calm hero: product name + one sentence of trust; a flat "live dismissal board" mock (CSS/SVG), three audience cards (Parent/Teacher/Gate), a workflow strip, a trust band (schools/security/uptime). No 3D, no glow.
2. **Parent dashboard** — single screen, state-driven: idle (greeting + Request CTA + child card) ↔ active (status + crisp SVG QR + countdown + Cancel). Soft `surface-subtle` band for school/realtime.
3. **Parent QR** — full-bleed scannable SVG QR, large, high-contrast; countdown + single-use note; "Show another way" (manual token) fallback.
4. **Teacher queue** — dense, fast-scan list: avatar + name + ADM + "scanned {time}" + waited label; one primary action per row; detail opens as bottom-sheet on mobile / centered on desktop.
5. **Gate scanner** — camera-first: full-viewport video, corner brackets, minimal verdict panel (verified/invalid) with tinted `StatusBadge`; manual token entry fallback. Certainty > decoration.
6. **Admin console** — one overview (scored `surface-subtle` stat band + recent list), then focused table screens (people/students/classes/dismissals/activity) with search/filter/pager. Differentiate primary vs secondary surfaces by weight, not borders.

Selected strongest ideas for DismissFlow: **state-driven single parent screen**, **camera-first gate**, **weight-differentiated admin overview**. All reject equal-weight card stacks and over-uppercasing.

---

## 21. DESIGN SKILL USAGE

- **Taste skill** — *not available in this environment.* Its role (overall visual taste / anti-slop) was filled conceptually by the `impeccable` (UX critique) and `apple-design` (restraint/precision) lenses applied during the UX audit.
- **Impeccable** — applied to hierarchy, typography, layout, interface quality (audit agent 5). Drove the KEEP/REDESIGN/SIMPLIFY/REMOVE/REPLACE matrix and the surface-weight/uppercase critique.
- **Emil Kowalski skills** (`emil-design-eng`) — interaction/motion/micro-interaction lens. Confirmed the current motion is already restrained and appropriate; informed the Motion Strategy (Section 22): keep ≤0.24s entrances, color/shadow hovers, single soft status pulse, global reduced-motion.
- **Stitch MCP** — *not available.* See Section 20.
- **Net:** the blueprint's visual language is coherent and premium-by-restraint, consistent with all four intended skills' purposes even though two tools were unavailable. Re-run Taste + Stitch in a provisioned environment before Phase 31 visual implementation to validate.

---

## 22. MOTION STRATEGY

- **Keep current restraint.** All motion = Tailwind keyframes + CSS transitions; `framer-motion` should be **removed** (unused).
- **Durations:** entrances ≤0.24s (fade/slide-up/scale), overlays ≤0.18s. Easing `cubic-bezier(0.2,0,0,1)` (already tokenized).
- **Hover:** color/shadow only, no layout shift. **Press:** subtle scale/ring. **Focus:** visible ring (already global).
- **Modal/Drawer/Toast/Dropdown:** existing entrance animations are good; keep.
- **Scanner feedback:** a single soft status pulse + a clear verified/invalid `StatusBadge` + brief haptic-style flash (CSS). No bouncy/parallax.
- **State transitions:** cross-fade status changes (parent dashboard realtime flip).
- **Respect `prefers-reduced-motion`** (global kill-switch already in `globals.css:105-114`). Under reduced-motion, replace frozen spinners with a static "Loading" label.
- **Avoid:** bouncing, constant motion, excessive parallax, decorative animation, animation for its own sake.

---

## 23. RESPONSIVE STRATEGY

Intentional layouts (not scaled-down desktop):
- **320 / 375 / 390 / 430 (mobile-first):** Parent + Gate are mobile-first. Gate = full-viewport camera. Parent = single-column state-driven. Teacher = mobile/tablet optimized (queue list; detail as bottom-sheet ≤`md`, centered `sm+`). Touch targets 40–44px.
- **768 (tablet):** Teacher detail centered dialog; admin becomes 2-col where sensible.
- **1024 / 1280:** Admin desktop — left sidebar (`lg:grid-cols-[16rem_1fr]`), tables full width, stat bands.
- **1440 / 1920 (`3xl`):** cap content at `max-w-content` (80rem); admin tables get comfortable column widths; do not stretch to full width.
- **Public:** responsive storytelling — single column on mobile, multi-column bands on `md+`.
- Keep the existing `AppShell` mobile Drawer + desktop Sidebar pattern; add Drawer Tab trap.

---

## 24. ACCESSIBILITY STRATEGY

- **Keyboard:** full focus management in Modal (done) + add Drawer Tab trap; roving tabindex in Tabs (done); skip-link to main; visible focus ring globally.
- **Focus:** `focus-visible` rings on all interactive; restore focus on overlay close (done in Modal/Drawer).
- **ARIA:** `role=dialog`/`aria-modal`, `aria-busy` on loading buttons, `aria-invalid` + `aria-describedby` on fields, `role=alert`/`role=status` + `aria-live` on feedback, `aria-current` on active nav, `aria-label` on icon-only controls.
- **Screen readers:** semantic landmarks (`header`/`nav`/`main`/`footer`), correct heading ladder, `Icon` `aria-hidden`.
- **Contrast:** AA pass on `warning` + `muted-foreground` at 12px; separate `info`/`primary` hues.
- **Forms:** label every input (fix `gate` raw input), error summary region where multi-field.
- **Dialogs:** Modal pattern is exemplary; extend to Drawer.
- **Tables:** `DataTable` already responsive + `th` scope; keep.
- **Live regions:** realtime status pill (`aria-live="polite"`), toasts.
- **Touch targets:** 40–44px on mobile icon/action buttons.
- **Reduced motion:** global kill-switch + static loading label.
- **3D:** never required to understand content (N/A — no 3D).

---

## 25. PERFORMANCE STRATEGY

- **Server Components** for read-only data (cuts client JS dramatically — today every page is client).
- **Dynamic imports / code splitting:** `next/dynamic` for the gate camera + `jsQR` (currently bundled into `/gate` with no further split); lazy-load heavy admin tables if needed.
- **Remove dead deps:** `framer-motion` (unused, large) and `@fontsource/geist-mono` (unused). Remove Lenis references from docs.
- **Fonts:** keep `next/font` Geist (self-hosted, zero CLS). Drop `@fontsource`.
- **Images:** `next/image` currently unused (avatars are initials) — keep; if photos added later, use `remotePatterns` (already allows `lh3.googleusercontent.com`).
- **Bundle:** convert pure-presentational primitives to Server Components where possible (many `ui/*` carry `"use client"` unnecessarily).
- **Hydration:** smaller client graph via Server Component data fetch + thin client leaves.
- **Mobile GPU:** no WebGL → no GPU cost; keep camera frame rate sane in `jsQR` loop.
- **Do not add unnecessary dependencies.**

---

## 26. SECURITY STRATEGY

Preserve the existing server-authoritative model — **do not modify the backend**:
- Server-side role resolution (`public.users.role` via `app_role()`); JWT has no role/school claim.
- Supabase Auth (email/password, derived email) unchanged.
- RLS (0017 tenant-scoped) is the real isolation boundary; frontend never supplies `school_id`.
- Tenant isolation: `school_id = public.app_school_id()` — keep.
- Edge Function authorization: all writes go through Edge Functions + service-role RPCs; browser never decides status.
- **Frontend risks to avoid in rebuild:** (a) do NOT move auth/role checks client-side; (b) fix the `schools.limit(1)` query to filter by resolved `school_id` (correctness, not a backend change); (c) do NOT expose `qr_tokens`/PII to the client; (d) keep the service-role key out of the bundle; (e) re-add a server-side `redirect()` for unauthenticated/wrong-role as UX hardening (RLS still enforces).
- Token crypto (256-bit CSPRNG, SHA-256 hash stored) is sound — keep.

---

## 27. PUBLIC WEBSITE PLAN

- `/` stays a Server Component (light, fast). Keep `PublicNav` + `LinkButton`.
- Content: trust-led hero, three audience cards, workflow strip, security/trust band, footer. Calm, no 3D/glow.
- CTAs route to `/login` (parent) and `/login/teacher|gate|admin` (staff).
- Update copy to match the real light product (not the stale dark docs).
- `/foundation` remains dev-only (blocked in prod by middleware) — keep as the token/component showcase, or fold into Storybook-like docs later.

---

## 28. AUTH PLAN

- Keep `AuthShell` (role-aware, accessible). Unify into one component fed by `signInParent`/`signInById`.
- Post-sign-in role re-check (sign out if mismatch) — keep.
- Add server-side `redirect()` hardening at layout boundary (UX), RLS still enforces.
- Labels: "Sign in with your child's admission number" (parent) / "Staff ID" (teacher/gate/admin). Clear error copy mapped from Auth errors.
- Remove dead `PublicLayout`/`TopNav` references.

---

## 29. PARENT PLAN

- Single state-driven dashboard (idle ↔ active ↔ outcome) — fixes the lost-QR dead-end by persisting `qrToken` in `sessionStorage` (not just React state) so remounts re-display the live code while valid.
- Fix status copy to be factually correct per actor (Section 7/9).
- Fix swallowed cancel error (render error while active).
- Crisp SVG QR + countdown + single-use note; manual-token fallback.
- History: add student name/class to history rows (currently missing) for context.
- Profile: fix `schools.limit(1)` → filter by resolved `school_id`.

---

## 30. TEACHER PLAN

- Queue: dense, fast-scan list; remove hardcoded "Awaiting decision" badge → derive from single status vocabulary.
- Detail: approve/reject + reject confirm modal (keep); optionally add an optional reject reason field (currently none).
- Remove dead `queueError` state; real error path via `AccessNote`.
- Mobile: detail as bottom-sheet ≤`md`.
- Keep realtime queue; reflect-only.

---

## 31. GATE PLAN

- Camera-first scanner; corner brackets; minimal verdict panel.
- **Add the missing client-side role guard** (every other page has one).
- Fix raw `<input>` to use the `Input` primitive (invalid/valid states, focus ring).
- Manual token entry fallback (keep).
- Verdict: tinted `StatusBadge` (verified/invalid) + clear next action. Use the returned `status` field rather than hardcoding "Awaiting teacher approval."
- Keep `jsQR` + 2D canvas; no WebGL.

---

## 32. ADMIN PLAN

- Overview: collapse stat groups into one `surface-subtle` band; differentiate primary vs secondary surfaces by weight.
- People/Students/Classes/Dismissals/Activity: keep `DataTable` + search/filter/pager; use `EmptyState` consistently (admin list empty currently inline).
- Fix "Status mix"/recent list to use school-wide aggregates (the `limit 100` undercounts on busy schools) — either raise the bound or compute true counts server-side.
- Fix activity filter to only expose terminal `final_status` values.
- Keep guardian PII omitted from lists (privacy-correct).
- Profile: school via resolved `school_id`.

---

## 33. MIGRATION STRATEGY

Incremental, each stage testable, existing app kept working:
1. **Design System hygiene** — delete dead components, merge duplicates, single status vocabulary, contrast pass, Drawer Tab trap, button-style util. (Low risk, high clarity payoff.)
2. **App Shell** — `withRoleGuard` helper, `useRequireRole`/`<AccessGate>`, fix `/gate` guard, optional server-side redirect.
3. **Public** — refresh landing copy/visuals to real light system.
4. **Auth** — unify `AuthShell`, harden redirects.
5. **Parent** — state-driven dashboard, QR persistence, copy fixes, cancel-error fix, history context, profile school fix.
6. **Teacher** — queue/detail polish, status vocabulary, reject reason (optional).
7. **Gate** — camera-first, guard, Input primitive.
8. **Admin** — surface-weight overview, DataTable consistency, aggregate/count fixes.
9. **(3D)** — skipped (none adopted).
10. **Motion** — confirm restraint, remove `framer-motion`, static reduced-motion loading.
11. **Responsive** — verify 320→1920 breakpoints, touch targets.
12. **Accessibility** — full audit pass (contrast, focus, ARIA).
13. **Performance** — Server Component data fetch, dynamic imports, dead-dep removal, primitive Server-Component conversion.
14. **Integration** — real Supabase end-to-end per portal.
15. **E2E** — Playwright across journeys.

---

## 34. TESTING STRATEGY

Existing (keep + extend): `typecheck` (`tsc --noEmit`), `lint`, `build`, `check:tokens` (no raw hex in `components/`), `test` (node:test crypto/scan/decision contracts — strong, real security logic).

Add:
- **Unit:** status vocabulary, `withRoleGuard`, `useRequireRole`, formatters.
- **Component:** render tests for `Modal`/`Drawer` focus trap, `StatusBadge`, `DataTable` empty/loading.
- **Typecheck/build:** CI gate.
- **Browser (Playwright):** parent request→QR→gate scan→teacher approve→final; wrong-role redirect; unauthenticated guard.
- **Responsive:** snapshot/visual at 320/768/1280/1920.
- **Accessibility:** axe/lighthouse on each portal; contrast check.
- **Auth/role isolation:** each role cannot read another's data (RLS enforced — assert client receives nothing cross-tenant).
- **Real data:** against the real Supabase (staging), not mocks.
- **Realtime:** simulate scan/decision → UI flips.
- **QR/scanner:** decode a generated token; single-use + expiry enforced by backend.
- **Error states:** force scan-qr error codes → correct `Alert` copy.

---

## 35. RISKS

1. **Breaking backend contracts** — changing a query column/Edge Function body shape. Mitigation: keep `lib/dismissal/client.ts` + `lib/realtime/subs.ts` contracts byte-stable; diff against `supabase/functions`.
2. **Auth regression** — moving checks client-side. Mitigation: RLS + Edge Function authority unchanged; frontend checks are UX only.
3. **RLS assumptions** — assuming client filtering. Mitigation: never pass `school_id` from client; rely on 0017 policies.
4. **Realtime regression** — subscribe to wrong table/event. Mitigation: keep `subs.ts` hooks; reflect-only.
5. **School isolation** — `schools.limit(1)` bug in parent profile. Mitigation: filter by resolved `school_id` (frontend fix).
6. **Role isolation** — missing `/gate` guard. Mitigation: add `<AccessGate>`.
7. **Server/Client mistakes** — over-using `"use client"`. Mitigation: Server Components for reads; thin client leaves.
8. **Three.js performance/WebGL/compat/mobile** — **avoided entirely** (no 3D adopted).
9. **Accessibility** — contrast, Drawer focus, touch targets. Mitigation: Section 24 pass.
10. **Bundle size** — dead deps + client bloat. Mitigation: remove `framer-motion`/`@fontsource`, dynamic imports, Server Components.
11. **Route regressions** — broken `/login/[role]` or nav. Mitigation: keep `navigation.ts` as single source; E2E.
12. **Data leakage** — exposing `qr_tokens`/PII. Mitigation: keep RLS-denied; never select it.

---

## 36. MITIGATIONS

- Single source of truth for: status vocabulary (`status-meta.ts`), nav (`navigation.ts`), button styles (`buttonStyles`), tokens (`tailwind.config.ts` + `globals.css`), realtime (`subs.ts`).
- Token-governance test extended to `globals.css`.
- Contract-stability: treat `lib/dismissal/client.ts` + Edge Function bodies as the API; add contract tests.
- Staged migration with per-stage E2E; keep the old app runnable until each stage is green.
- RLS remains the security boundary; all frontend auth is UX hardening.
- No backend changes in this phase or the rebuild's early stages.

---

## 37. IMPLEMENTATION ORDER

Phase 31: Design-system hygiene (dead-code deletion, dedupe, status vocabulary, contrast, Drawer trap) → **foundation for everything**.
Phase 32: App Shell + guards (`withRoleGuard`, `useRequireRole`, `/gate` guard, redirects).
Phase 33: Public.
Phase 34: Auth.
Phase 35: Parent (state-driven dashboard, QR persistence, copy/error fixes).
Phase 36: Teacher.
Phase 37: Gate (camera-first, guard, Input primitive).
Phase 38: Admin (surface-weight overview, DataTable consistency, aggregates).
Phase 39: Motion + Responsive + Accessibility passes.
Phase 40: Performance (Server Components, dynamic imports, dead-dep removal).
Phase 41: Integration (real Supabase E2E per portal).
Phase 42: E2E + launch hardening.

Dependencies: 31 before all (hygiene unblocks dedupe); 32 before 33–38 (shell/guards shared); 35–38 independent of each other but depend on 32; 39–40 can run after 33–38; 41–42 last. **Three.js stage is omitted** ( none adopted).

---

## 38. FILES INSPECTED

Read-only. (Absolute paths under `D:\Projects\DismissFlow EPS\.claude\worktrees\chamgadar`.)
- `package.json`, `next.config.js`, `tsconfig.json`, `postcss.config.mjs`, `tailwind.config.ts`, `app/globals.css`, `middleware.ts`, `.env.example`, `app/layout.tsx`, `scripts/check-no-hex.mjs`, `scripts/provision-demo-identities.mjs`
- `app/page.tsx`, `app/login/page.tsx`, `app/login/[role]/page.tsx`, `app/foundation/page.tsx`
- `app/parent/{layout,page,history/page,profile/page}.tsx`, `app/parent/actions.ts`
- `app/teacher/{layout,page,[requestId]/page,profile/page}.tsx`, `app/teacher/actions.ts`
- `app/gate/{layout,page,profile/page}.tsx`, `app/gate/actions.ts`
- `app/admin/{layout,page,people/page,students/page,classes/page,dismissals/page,activity/page,profile/page}.tsx`, `app/admin/actions.ts`, `app/admin/_ui.tsx`
- `components/ui/*` (all 45), `components/layout/*`, `components/auth/AuthShell.tsx`, `components/marketing/*`
- `lib/supabase/{client,server}.ts`, `lib/auth/{parent-login,role-login,session}.ts`, `lib/dismissal/{client,state,status-meta}.ts`, `lib/realtime/subs.ts`, `lib/qr/{generate.tsx,scan.ts}`, `lib/qr/__tests__/*`
- `supabase/functions/*/index.ts`, `supabase/functions/_shared/{scan-contract,decision-contract}.ts`, `supabase/migrations/0001,0003,0007,0015,0017*.sql`
- `README.md`, `Docs/architecture.md`, `Docs/design/README.md` (doc-drift findings)

---

## 39. FILES MODIFIED

**None.** Phase 30 is audit + blueprint only. No application source, config, or docs were changed.

---

## 40. BACKEND CHANGES

**None.** Supabase schema, RLS, Edge Functions, Realtime, and Auth configuration are untouched. One frontend *query* correction is recommended (`schools.limit(1)` → filter by resolved `school_id`) but that is a frontend change executed in Phase 35, not a backend change.

---

## 41. SUPABASE CHANGES

**None.** No migrations, no RLS changes, no Edge Function changes, no Realtime changes.

---

## 42. DEPLOYMENT

**None.** No deploy in Phase 30.

---

## 43. GIT

**None.** No commit, no push, no branch changes. Working tree is on `worktree-chamgadar`; only this blueprint file is newly present (untracked). Phase 30 rule: do not commit.

---

## 44. KNOWN LIMITATIONS

- **Stitch MCP unavailable** — live visual generation not run; direction is analysis-based (Section 20). Re-run with MCP provisioned before Phase 31 visual work.
- **Taste skill unavailable** — its role filled by `impeccable`/`apple-design` lenses (Section 21).
- **Doc drift** — `README.md` / `Docs/design/README.md` describe a removed dark aesthetic; they must be rewritten to the real light system.
- **Multi-tenant untested at scale** — pilot is single-school ("Tulip"); the `schools.limit(1)` bug and `limit 100` admin aggregates are masked today but will surface in multi-tenant.
- **No super-admin / new-school bootstrap** — `0017` notes this is not implemented; out of scope for frontend rebuild but a product constraint.
- **Frontend audit only** — backend internals read for contract reconstruction but not modified or deeply re-audited for security (that is a separate security review).

---

## 45. FINAL RECOMMENDATION

Proceed to Phase 31 with the **Design System Hygiene** stage first: it is low-risk, removes the ~10 dead components and 3 duplicated status mechanisms, unifies the status vocabulary (fixing the wrong "Approved" copy), and performs the contrast pass. This alone resolves most of the "unresolved intent" that fragments the otherwise strong, calm, premium direction the tokens and `Modal`/`AuthShell` already demonstrate. **Do not adopt Three.js.** Keep the server-authoritative Supabase model intact. Preserve the existing token system; refine (do not redesign) surface weight, uppercase density, and motion. Re-run Taste + Stitch in a provisioned environment to validate the visual direction before visual implementation.

---

## 46. FINAL VERDICT

**FRONTEND REBUILD BLUEPRINT READY.**

The repository has been thoroughly audited (Steps 1–24). The architecture, UX critique, visual language, Three.js strategy (none adopted, with reasoning), migration plan, and testing strategy are coherent and internally consistent. Two environment limitations (Stitch MCP, Taste skill unavailable) were documented honestly and compensated for. No source was modified; no backend/Supabase/deploy/commit/push occurred.

**Do not start Phase 31.** Do not build the new frontend. Do not modify the backend. Do not deploy. Do not commit. Do not push — until the stakeholder confirms this blueprint.
