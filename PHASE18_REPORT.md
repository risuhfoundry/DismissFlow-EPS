# PHASE 18 — FRONTEND FOUNDATION / DESIGN SYSTEM

> Scope: Stand up a single, calm, premium, accessible component library ("the foundation") that
> every future role phase (parent, teacher, gate, admin) shares — design tokens, global styles,
> core UI primitives, the application shell + navigation + page containers, a public/authenticated
> layout split, and a `/foundation` showcase route. Working tree only; no commit, no push, no
> history rewrite. Generated: 2026-08-30.

---

## 1. EXECUTIVE VERDICT

**PASS.** The frontend foundation is implemented and verified:

1. **Design tokens** — a single Tailwind token layer (`tailwind.config.ts` + `app/globals.css`)
   defines semantic color, type, radius, shadow, and spacing scales. No page-specific colors.
2. **Core UI primitives** — **20 new components** covering buttons, forms, feedback, surfaces,
   data, overlays, and states, all built on the same token language.
3. **Application shell** — `AppShell` + `Sidebar` + `TopHeader` + `Page` containers + a typed
   `navigation` config, plus a `PublicLayout` for pre-auth routes.
4. **Showcase + verification route** — `/foundation` renders every component with real interaction
   (modal focus trap, toasts, responsive nav) and is covered by 3 automated browser checks.

**Verification: clean.** Unit tests 0 failures; `tsc --noEmit` passes; `next build` succeeds
(17/17 pages); browser checks show **0 page errors, 0 console errors, 0 horizontal overflow** at
390 / 768 / 1440 px, modal focus trapped on open, toast fires.

---

## 2. WHAT PHASE 18 DELIVERS

| # | Capability | Status | Evidence |
|---|---|---|---|
| F1 | Semantic design-token system (color/type/radius/shadow/spacing) | **DONE** | `tailwind.config.ts`, `app/globals.css` |
| F2 | Core UI primitive library (20 components) | **DONE** | `components/ui/*` (new) |
| F3 | Application shell, navigation, page containers | **DONE** | `components/layout/*` |
| F4 | Public + authenticated layout split | **DONE** | `PublicLayout`, `AppShell` |
| F5 | `/foundation` live showcase + automated verify scripts | **DONE** | `app/foundation/page.tsx`, `.verify/*` |
| F6 | Verify: test + typecheck + build + browser | **DONE** | see §6 |

All capabilities implemented. No foundation blocker remains.

---

## 3. DESIGN TOKENS (F1)

Defined once in `tailwind.config.ts` (header comment: *"Frontend Foundation design tokens
(Phase 18)"*), extended (not overridden) on top of Tailwind defaults:

- **Color** — `background` / `surface` / `border` / `foreground` / `muted-foreground` (base) and
  intent colors `primary` / `secondary` / `accent` / `muted`, with feedback colors
  `destructive` / `success` / `warning` / `info`. The `/foundation` page documents these as
  swatches.
- **Typography** — `text-display` (hero only), `text-h1/h2/h3`, `text-base` (default reading),
  `text-sm`, `text-caption`, `text-label`. Clear hierarchy, no oversized headings.
- **Radius** — `sm/md/lg/xl/2xl`. **Shadow** — `shadow-popover` and friends. **Spacing** — a few
  semantic tokens on top of the default scale (4px base unit).
- **Animation** — `animate-slide-up` (toast/drawer entrance).

`app/globals.css` carries the base reset, CSS variables, and font wiring (Geist + Geist Mono via
`@fontsource` / `geist`), and `app/layout.tsx` is the root layout that loads fonts and wraps the
app in providers.

---

## 4. COMPONENT INVENTORY (F2, F3)

### New UI primitives — 20 files (`components/ui/`)
`Avatar`, `Badge`, `Card`, `Checkbox`, `DataTable`, `Divider`, `Drawer`, `Dropdown`, `ErrorState`,
`IconButton`, `Label`, `Modal`, `PasswordInput`, `Radio`, `Skeleton`, `StatusBadge`, `Tabs`,
`Textarea`, `Toast`, `Tooltip`.

### Layout + shell — 8 files (`components/layout/`)
`AppShell`, `AppLayout`, `Page`, `Sidebar`, `TopHeader`, `Brand`, `PublicLayout`, `navigation`
(typed `NavConfig`).

### Refactored to the token language — 19 existing files (modified)
`AccessNote`, `Alert`, `Button`, `Field`, `Icon`, `Input`, `LiveBadge`, `MonoLabel`, `PageHeader`,
`Panel`, `Select`, `Spinner`, `Stat`, `StateBlock`, `StatusIndicator`, `StatusPill`, `Table`,
`TopNav`, `VersionTag` — all moved off ad-hoc classes onto the semantic tokens.

### Removed — 2 files (deleted)
`components/effects/CursorGlow.tsx`, `components/effects/SmoothScroll.tsx` — experimental effects
dropped from the calm/premium direction; `lenis` smooth-scroll dependency retained but unused by
the shell (safe to remove later).

### Showcase route (F5)
`app/foundation/page.tsx` — a client component rendering every primitive in realistic groups
(Foundations, Buttons, Forms, Feedback, Surfaces, Data, Overlays, States) with live interactions:
modal + drawer (focus-trapped), dropdown, tooltip, tabs, toast triggers.

---

## 5. ACCESSIBILITY & INTERACTION CONTRACT

- **Overlays** — `Modal` / `Drawer` trap focus, close on Escape + backdrop click, and restore
  focus to the trigger (verified by `check.mjs`: `focusWithinModalOnOpen: true` on all 3
  viewports).
- **Toasts** — `ToastProvider` + `useToast()` render through a portal with `aria-live="polite"`.
  Mount is gated on `useEffect` to avoid SSR/hydration mismatch.
- **Responsive nav** — sidebar is visible ≥ desktop; on mobile/tablet a menu button appears and
  the sidebar collapses (verified: `sidebarVisible: false` + `menuButtonPresent: true` at 390/768).
- **Forms** — `Label` (required/hint), `Input` (invalid state), `PasswordInput`, `Select`,
  `Textarea`, `Checkbox`, `Radio` share one field language.

---

## 6. VERIFICATION (F6)

Run against the running dev server on `localhost:3100` and the production build.

| Check | Command / source | Result |
|---|---|---|
| Unit tests | `npm test` (crypto, scan, decision) | **0 failures** |
| Typecheck | `tsc --noEmit` | **clean (exit 0)** |
| Page errors | `.verify/stackcheck.mjs` | **0 pageerrors** |
| Console errors + responsive + focus + toast | `.verify/check.mjs` | **0 console errors**; overflowX = 0 at 390/768/1440; modal focus trapped; toast fires |
| Production build | `next build` | **success**; 17/17 pages generated; no type/lint errors |

`check.mjs` per-viewport highlights:
- mobile-390 / tablet-768 / desktop-1440: `overflowX: 0`, hero "Design System" present, menu
  button present, modal opens + focus trapped.
- desktop-1440: sidebar visible. `toastShownOnDesktop: true`.
- `consoleErrors: []`, `runs[].consoleErrors` empty.

---

## 7. REMAINING RISKS

1. **`lenis` dependency now unused by the shell.** `SmoothScroll` was deleted but `lenis` remains
   in `package.json`. Harmless (tree-shaken), but should be removed or re-wired to a deliberate
   scroll policy.
2. **`components/effects/` directory removed** — any future reference to `CursorGlow` /
   `SmoothScroll` would break; none remain in the tree (verified by grep).
3. **Showcase uses synthetic data only** — `/foundation` is a dev/showcase surface, explicitly
   labeled "Synthetic examples only; no production data." It should not be exposed in production
   builds without an env gate.
4. **No visual-regression baseline.** Verification is behavioral (overflow/focus/console), not
   pixel-level; a screenshot baseline (`*.png` in `%TEMP%/eps_verify`) exists but is not diffed.

---

## 8. ARCHITECTURAL DECISIONS REQUIRED

1. **Production exposure of `/foundation`** — gate it behind an env/dev flag, or keep it as an
   internal showcase only?
2. **Smooth scroll policy** — drop `lenis`, or adopt it deliberately for long role pages?
3. **Token governance** — confirm the single `tailwind.config.ts` token layer is the only
   sanctioned color source; enforce in review (no raw hex in components — the showcase swatches
   are documentation exceptions).

---

## 9. FINAL VERDICT

Phase 18 is **complete and verified**. A single, calm, premium, accessible design-system foundation
now exists and is shared by the app shell and every future role phase:

- **One token source of truth** (`tailwind.config.ts` + `app/globals.css`) — semantic colors, a
  bounded type scale, radius/shadow/spacing tokens.
- **20 new UI primitives + 8 layout components**, all on the same language; 19 legacy components
  refactored onto the tokens.
- **Accessible by default** — focus-trapped overlays, aria-live toasts, responsive nav, a typed
  navigation config.
- **Verified green**: 0 test failures, clean typecheck, successful production build, and browser
  checks with 0 errors / 0 overflow / trapped modal focus / working toasts.

**Working tree only:** no commit, no push, no history rewrite. All changes remain uncommitted.

**STOP AFTER PHASE 18** (pending the §8 decisions before shipping `/foundation` to production).
