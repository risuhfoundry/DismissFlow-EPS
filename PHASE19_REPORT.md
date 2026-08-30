# PHASE 19 — VISUAL DESIGN SYSTEM REPORT

## VERDICT
**VISUAL SYSTEM READY.** The DismissFlow visual design language is finalized as a single,
calm, premium light theme built entirely on semantic tokens. All automated gates pass
(typecheck, 26/26 tests, production build, token governance = 0 violations) and real
browser verification at 320/390/768/1024/1440 confirms zero horizontal overflow, working
keyboard/focus/modal/toast behavior, reduced-motion rendering, and the production guard
blocking `/foundation`. No backend, Supabase, auth, or data changes were made.

---

## DESIGN DIRECTION
- **Personality:** modern, premium, calm, professional, human, clean — a serious
  school-operations platform, not a consumer toy.
- **Emotional goals:** Trust / Safety / Clarity / Reliability / Speed / Simplicity.
- **Strategy:** One light theme. Semantic tokens are the single source of truth; no
  page-specific colors and no raw hex in `components/`. Restraint over decoration —
  most surfaces stay flat with a hairline border; elevation appears only where it earns
  attention (popovers, modals, selected/hover states).
- **Typography:** A tight application type ramp (Display → H1–H4 → Body → Caption →
  Label → Overline). No oversized marketing headings inside the app.
- **Color:** A confident, slightly-indigo blue as the single intent color; feedback
  colors (success/warning/danger/info) are restrained and AA-legible, distinct from
  primary.

---

## COLOR SYSTEM
All values live in `tailwind.config.ts`. No raw hex appears in `components/`.

**Canvas & surfaces**
| Token | Value | Use |
|---|---|---|
| `background` | `#F5F7FA` | App canvas |
| `card` / `surface-elevated` | `#FFFFFF` | Elevated/default surface |
| `surface-subtle` | `#EEF1F6` | Recessed panel / secondary surface |
| `border` | `#E2E6EE` | Hairline structure |
| `border-strong` | `#CDD3DF` | Emphasized structure |
| `input` | `#E2E6EE` | Input border |
| `ring` | `#2C56D6` | Focus ring |

**Text**
| Token | Value |
|---|---|
| `foreground` (text-primary) | `#0E1726` |
| `content.secondary` (text-secondary) | `#3C4658` |
| `muted-foreground` / `content.muted` | `#697586` |
| `content.inverse` | `#FFFFFF` |

**Intent (primary)**
| Tone | Value |
|---|---|
| `primary` | `#2C56D6` |
| `primary-hover` | `#2348B8` |
| `primary-active` | `#1D3C9B` |
| `primary-soft` / `primary-subtle` | `#EEF2FE` |
| `primary-foreground` | `#FFFFFF` |

**Feedback** (DEFAULT / hover / soft / foreground)
| Group | DEFAULT | hover | soft | fg |
|---|---|---|---|---|
| `success` | `#16864A` | `#116B3B` | `#E7F5EE` | `#FFFFFF` |
| `warning` | `#B7791A` | `#956112` | `#FBF3E2` | `#FFFFFF` |
| `destructive` / `danger` | `#D23B3B` | `#B22B2B` | `#FCEBEB` | `#FFFFFF` |
| `info` | `#0E84B4` | `#0A6C95` | `#E5F3FA` | `#FFFFFF` |

> `soft` and `subtle` are provided as aliases for every feedback color so legacy
> `-soft` class names keep working while the spec's `-subtle` naming is honored.

---

## TYPOGRAPHY
Single Geist Sans family (Geist Mono for code). Ramp (`tailwind.config.ts → fontSize`):

| Token | Size | Weight | Notes |
|---|---|---|---|
| `display` | clamp(2.25→3.25rem) | 700 | Hero/marketing only, used sparingly |
| `h1` | 1.875rem | 700 | Page titles |
| `h2` | 1.4375rem | 650 | |
| `h3` | 1.1875rem | 650 | Section titles |
| `h4` | 1.0625rem | 600 | |
| `body-lg` | 1.0625rem | 400 | Lead text |
| `base` | 0.9375rem | 400 | Default body |
| `sm` | 0.875rem | 400 | |
| `xs` | 0.8125rem | 400 | |
| `caption` | 0.75rem | 400 | |
| `label` | 0.8125rem | 600 | Form labels |
| `overline` | 0.6875rem | 600 | 0.08em tracking, uppercase |
| `code` | 0.8125rem | 400 | Mono |
| `title`* | 1.375rem | 650 | Legacy alias for dialog/drawer titles |

\* `title` was re-added in Phase 19 so `Modal`/`Drawer` headings (which reference
`text-title`) keep their size after the token rewrite.

---

## SPACING
Built on Tailwind's 4px base rhythm. App content uses `max-w-content` (1280px) with
responsive horizontal padding. Added a few semantic steps (`4.5`, `13`, `15`, `18`)
for specific gaps. Components consistently use `gap-*` tokens rather than ad-hoc margins.

## RADIUS
`sm .375` (chips/badges) · `md .5` (inputs/buttons) · `lg .75` (cards/dropdowns) ·
`xl 1` (modals/large) · `2xl 1.25` · `full` (pills/avatars). Default `.5rem`.

## SHADOWS
Restrained, cool-tinted elevation: `sm`, `card`, `popover`, plus `focus`
(`0 0 0 3px rgba(44,86,214,.30)`) and `focus-danger` for accessible focus rings.
Most surfaces are flat with a hairline border; shadows appear on hover/selected/
floating surfaces only.

---

## COMPONENTS REFINED
The library was already token-driven and high quality; Phase 19's leverage was the
**token layer** plus targeted, audited additions:

- **Button / IconButton** — variants (primary/secondary/outline/ghost/danger), sizes,
  loading + disabled states, duplicate-submit guard, `leftIcon`/`rightIcon`.
- **Card** — `tone` prop: `default | interactive | selected | danger | success | muted |
  soft`. Hover lift, primary selection ring, semantic tints.
- **Badge / StatusBadge / StatusPill** — tone system + pulse; StatusPill encodes the
  DismissFlow dismissal lifecycle (see FEEDBACK).
- **Alert** — 4 tones (success/info/warning/error) with icons.
- **Modal / Drawer / Dropdown / Tabs** — accessible overlays (focus trap/restore, Esc,
  outside-click, roving arrow nav).
- **Table / DataTable** — declarative `DataTable<T>` with alignment, loading/empty
  states, and horizontal scroll on small screens.
- **Toast** — provider + `useToast()` hook, 4 tones, auto-dismiss.
- **Skeleton / Spinner / EmptyState / ErrorState / LoadingState** — loading & empty
  language, reduced-motion safe.
- **Avatar / Divider / Stat / StatCard** — supporting primitives.
- **Input / Select / Textarea / PasswordInput / Checkbox / Radio / Label** — `valid`
  (green) / `invalid` (red) border priority, accessible show/hide, value-based select.

---

## NAVIGATION
- **AppShell** — config-driven shell (TopHeader + collapsible Sidebar + mobile Drawer);
  reused by all future role phases via `navSections`. Toast provider wired here.
- **Sidebar** — active item now shows a left accent rail (`before:` pseudo-element,
  `bg-primary`) plus `bg-primary-soft` tint and `aria-current="page"`.
- **TopHeader** — responsive fix: wordmark text drops to `text-base` below `sm` so the
  header (menu + logo + bell + account avatar) fits 320px with no overflow.

## FORMS
Validated states demonstrated in the showcase: `invalid` (red border + `ring-destructive`),
`valid` (green border + `ring-success`), and the neutral hover/border-strong default.
Password field has an accessible show/hide toggle (`aria-label` flips with state).
Select keeps a value-based `onChange` for existing call sites.

## FEEDBACK
- **Alerts** (4 tones) and **Toasts** (success/error/info/warning) for transient messaging.
- **DismissFlow status language** — the canonical lifecycle, shown via `StatusPill`:

| Status | Label | Tone |
|---|---|---|
| `REQUESTED` | Awaiting Gate Scan | info |
| `AWAITING_TEACHER` | Awaiting Teacher | info |
| `DISMISSED` | Dismissed | success |
| `REJECTED` | Rejected | danger |
| `CANCELLED` | Cancelled | neutral |
| `EXPIRED` | Expired | neutral |
| `IDLE` | No Active Request | neutral |

This vocabulary is the shared contract across Gate / Teacher / Parent / Admin.

## TABLES
`Table` (presentational) wrapped in `overflow-x-auto` in the showcase; `DataTable<T>`
(declarative columns + `rowKey`) self-wraps with horizontal scroll and supports
loading/empty rendering.

## MODALS / DRAWERS
- **Modal** — `role="dialog"`, `aria-modal`, Escape + backdrop close, focus moved in
  and restored on close, Tab trapped, body scroll locked.
- **Drawer** — slides from edge, same focus contract, ideal for mobile filters/detail.
- **Dropdown** — outside-click + Escape close, focus returns to trigger.
- **Tabs** — `role=tablist/tab/tabpanel`, roving Arrow-key navigation.

## ICONS
Single 24×24 stroke grid, 1.6 weight, rounded caps (`Icon`, `IconName`). `aria-hidden`
by default; pair with visible text or `.sr-only`. 54 icons cover navigation, identity,
dismissal, and status.

## MOTION
Keyframes: `fade-in`, `slide-up`, `scale-in`, `slide-in-right`, `overlay-in`,
`pulse-soft`. All short (0.16–0.24s) with a `cubic-bezier(0.2,0,0,1)` standard easing.
`prefers-reduced-motion` is respected globally in `globals.css` (animations disabled).

## RESPONSIVE
Verified at 320 / 390 / 768 / 1024 / 1440 — **zero horizontal overflow** at every
width. Tables scroll horizontally; the mobile nav collapses into a Drawer; the brand
mark shrinks on phones. Layout primitives (`Page`, `Section`, `CardGrid`, `Stack`,
`Inline`) are mobile-first.

## ACCESSIBILITY
- `focus-visible` rings use `ring` (primary) / `focus-danger` on destructive controls.
- Modals/Drawers trap and restore focus; Dropdowns/Tabs are keyboard-operable.
- `aria-current`, `aria-modal`, `role=*` wiring; icons `aria-hidden`.
- `.sr-only` utility and `prefers-reduced-motion` support built in.
- Color pairings meet AA for text on surface and on intent fills.

## TOKEN GOVERNANCE
`scripts/check-no-hex.mjs` (invoked via `npm run check:tokens`) scans `components/**`
for raw hex (`#[0-9a-f]{3,6}`) in `.ts/.tsx/.css`, excluding `node_modules`/`.next`,
`url(...)`/`data:` lines, and `hex-ignore` lines. **Result: 0 violations.** This
guarantees components stay token-driven.

---

## TEST
`npm test` → **26/26 passing** (4 suites). No test changes were required; the design
system is additive and non-breaking to existing RPC/exception-mapping suites.

## TYPECHECK
`npm run typecheck` (`tsc --noEmit`) → **clean**.

## BUILD
`npm run build` → **success**. `/foundation` prerenders as a static route
(15.6 kB / 112 kB First Load JS). Middleware compiles (85.3 kB).

## BROWSER VERIFICATION
Real Playwright (Chromium) run against dev (`:3101`) and prod (`:3102`):

| Check | Result |
|---|---|
| No horizontal overflow @ 320 / 390 / 768 / 1024 / 1440 | ✅ all 0px |
| Modal opens via keyboard (focus + Enter) | ✅ |
| Modal focus trapped inside dialog | ✅ |
| Modal closes on Escape | ✅ |
| Toast renders with correct text | ✅ |
| Reduced-motion (390px) renders | ✅ |
| Prod `/foundation` → 404 (guard) | ✅ |
| Console / page errors | 0 |

`/foundation` is **200 in dev** (accessible) and **404 in production** (blocked via
`middleware.ts` NODE_ENV guard) — confirming the Phase 18.1 protection holds.

---

## FILES CHANGED (Phase 19)
1. `tailwind.config.ts` — semantic token system, type ramp, radius/shadow, animations,
   re-added `title` alias; `INK`/`SURFACE`/`PRIMARY`/`FEEDBACK` constants.
2. `app/globals.css` — base layer retuned to new palette; focus ring, selection,
   scrollbar, `.eyebrow`, `.sr-only`, `.tabular`, reduced-motion block.
3. `app/foundation/page.tsx` — rewritten as the comprehensive, hex-free design-system
   showcase (foundations, buttons, forms, feedback, surfaces, DismissFlow status,
   data, overlays, states).
4. `components/ui/Card.tsx` — `tone` prop + 7 surface treatments.
5. `components/ui/Input.tsx` — `valid`/`invalid` states.
6. `components/ui/Select.tsx` — `valid`/`invalid` states.
7. `components/ui/Textarea.tsx` — `valid`/`invalid` states.
8. `components/ui/PasswordInput.tsx` — `valid`/`invalid` states.
9. `components/layout/Sidebar.tsx` — active accent rail.
10. `components/layout/Brand.tsx` — responsive wordmark (fixes 320px header overflow).

(Continuing from Phase 18.1: `middleware.ts`, `scripts/check-no-hex.mjs`, `package.json`,
and `lenis` removal remain in place and unchanged by this phase.)

## BACKEND CHANGES
**NONE.** No Supabase client, auth, RLS, Edge Functions, RPCs, schema, tenant, or
Realtime changes.

## SUPABASE CHANGES
**NONE.**

## REMAINING WORK
- Build the actual role applications (Parent / Gate / Teacher / Admin) on top of this
  language — explicitly **out of scope** for Phase 19.
- Optional future: dark theme token set, icon-set extension, component visual tests.
- The `foundation` route is a development-only review surface and must stay blocked in
  production (guard verified passing).

## BLOCKERS
**NONE.**

---

## FINAL VERDICT
# VISUAL SYSTEM READY
The DismissFlow visual design language is complete, token-governed, accessible,
responsive from 320px, and verified by build + tests + browser. It is safe to build the
role applications (Phase 20+) on top of it.

> STOP — Phase 19 complete. No Phase 20 work was started.
