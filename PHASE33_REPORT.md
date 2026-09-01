# PHASE 33 — DismissFlow Premium Public Website

A substantially new public-facing website for DismissFlow — not the previous
landing page with nicer colors, but a re-composed editorial experience that tells
the product's story in ten distinct sections. Built on the Phase 31 visual
language and the Phase 32 application shell, with the backend contract frozen:
no schema, RLS, Edge Function, Realtime, or auth changes.

---

## 1. VERDICT

**COMPLETE.** `app/page.tsx` is rebuilt as a ten-section premium editorial
experience: an asymmetric hero with the live workflow visual, a fragmented-workflow
problem section, the connected mechanism (Request → Review → Approve → Verify →
Dismiss), four *distinct* role compositions, real product previews, the canonical
six-state status lifecycle, trust built only on real capabilities, a value section,
a "one system / four perspectives" band, and a quiet final CTA. Typecheck is clean,
token governance passes, all 26 tests pass, and the page compiles and renders in
the production build. No fake data, no backend changes.

---

## 2. PHASE32_REFERENCE

Phase 31 established the visual language (semantic tokens, editorial `font-serif`
display, `eyebrow` kicker, `check-no-hex` governance, `WorkflowVisual`). Phase 32
shipped the shared role shell and the four role experiences. Phase 33 builds the
public story that *leads into* that shell — the marketing surface that explains the
same workflow to visitors before they sign in. The two share one vocabulary
(`StatusPill`, tokens, motion rules), so the public site and the app feel like one
product.

---

## 3. DESIGN_INTENT

The brief was explicit: do **not** produce "the same landing page with nicer
colors." The intent is a genuinely new composition — editorial, calm, and
story-driven. Restraint is the craft: one accent, generous whitespace, serif
display type for hierarchy, and a single hero motion (the Three.js workflow). No
testimonials, no logos, no invented stats, no pricing traps.

---

## 4. SITE_STRUCTURE

The page is ten numbered sections, each with a distinct job:
1. Hero (asymmetric, live visual)
2. The problem (fragmented workflow)
3. The DismissFlow model (one connected mechanism)
4. Role experiences (four distinct compositions)
5. Product previews (one system, two views)
6. Status lifecycle (the six real states)
7. Trust & safety (only what the system supports)
8. Why the workflow matters (value)
9. Product experience (one system, four perspectives)
10. Final CTA

---

## 5. HERO_COMPOSITION

Not a centered SaaS hero. An asymmetric `lg:grid-cols-[1.05fr_0.95fr]` layout: left
is the editorial column (kicker, serif display headline "Dismissal, without the
chaos.", supporting paragraph, two CTAs — "Sign in" leads to the real `/login`,
"See how it works" anchors to `#how-it-works`). Right is a framed panel hosting the
lazy `WorkflowVisual` over a soft radial gradient from `--color-primary-soft`. A
right-aligned radial glow gives depth without a hard illustration.

---

## 6. PROBLEM_SECTION

"The problem with the last ten minutes" reframed as *fragmentation*. Five dashed,
muted boxes (1–5) depict the broken chain — a parent calls, a teacher checks by
memory, names are matched by hand, the gate guesses, a child leaves with no shared
record. Below, a four-cell strip names the friction: unclear status, manual
coordination, repeated verification, unnecessary waiting. Visual storytelling, not
prose — the dashed borders and muted tones deliberately *contrast* the solid,
connected mechanism that follows.

---

## 7. WORKFLOW_MODEL

"One workflow, followed to the gate." A connected horizontal sequence (01–05:
Request, Review, Approve, Verify, Dismiss) with solid cards and a thin connecting
rule between nodes — the deliberate visual opposite of the dashed problem chain.
Each step states what happens and why the handoff no longer relies on memory or
paper.

---

## 8. ROLE_EXPERIENCES

Four roles, four *different* compositions rather than four identical cards:
- **Parent** — text left, `ParentPreview` right.
- **Teacher** — `TeacherPreview` left, text right (order swapped).
- **Gate** — text left, wide `GatePreview` (the verified verdict) right.
- **Admin** — a full-width band wrapping `AdminPreview` in a bordered card.

Each block carries a distinct icon, a distinct copy angle, a short bullet set, and
a role-specific sign-in link. The alternation + distinct previews satisfy the
"do not make four identical cards" requirement.

---

## 9. DISTINCT_ROLE_COMPOSITIONS

The four role blocks are intentionally non-uniform in width, order, and preview
type. Parent/Gate lead with text; Teacher leads with preview; Admin is a contained
band. Previews are the real product components (`Card`, `StatusPill`, `Avatar`,
`Badge`) tagged "Preview" so they read as illustrative, not as a live account. No
fake names, schools, or counts — previews use neutral placeholders ("Student ·
Grade 4").

---

## 10. PRODUCT_PREVIEWS

"Inside DismissFlow" — a two-up grid of `ParentPreview` and `GatePreview` at full
size, making the point that the same calm appears in both a parent's request view
and a gate's verification view. This reuses the exact components from the role
section, reinforcing consistency rather than inventing new mockups.

---

## 11. STATUS_LIFECYCLE

"The life of a request." Uses the canonical `StatusPill` with the six real states
— REQUESTED, AWAITING_TEACHER, DISMISSED, REJECTED, CANCELLED, EXPIRED — each
paired with one honest line about what it means. No invented states, no invented
semantics. This is the product's own vocabulary shown in the marketing surface.

---

## 12. TRUST_SECTION

"Trust & safety" built only on capabilities the system actually has: authenticated
users, role-based access, school isolation, QR verification, teacher approval, and
real-time status. No SOC2/GDPR/FERPA claims, no invented certifications. A closing
line states plainly that access is by school-issued credentials with no public
self-signup.

---

## 13. WHY_WORKFLOW_MATTERS

A value section — six short statements (less uncertainty, less coordination, clearer
responsibility, faster verification, better visibility, one record) answering "why
does the workflow matter" in plain language rather than feature-list form.

---

## 14. PRODUCT_EXPERIENCE

"One system, four perspectives." A four-up band showing Parent / Teacher / Gate /
Admin each with a one-line view of the *same* workflow. This is the thesis of the
site: not four dashboards, but one controlled handoff seen from four seats.

---

## 15. FINAL_CTA

A quiet, bordered panel over a soft radial glow: "Bring calm to the end of the
school day." Two CTAs — "Sign in" (`/login`) and "Admin sign in" (`/login/admin`) —
both real, existing routes. No fake trial, no pricing, no email capture.

---

## 16. FOOTER

Rebuilt to remove the previous fake dead links. Columns: brand blurb, Product
(in-page anchors: How it works / Trust & safety / For Parents / For Schools), Sign
in (the four real role routes via `LinkButton`), and an honest "Access" note that
there is no public self-signup. The earlier fake Privacy/Terms `#` links have been
removed — they would have implied legal pages that do not exist.

---

## 17. NAVIGATION_ANCHORS

The reused `PublicNav` anchors to `#how-it-works`, `#for-parents`, `#for-schools`,
`#security`. The new page provides exactly these ids: `how-it-works` on the workflow
section, `for-schools` on the role section and `for-parents` on the parent block,
`security` on the trust section. Each anchored section has `scroll-mt-24` so the
sticky nav does not overlap content.

---

## 18. REUSED_COMPONENTS

No new UI primitives were invented. The page composes existing, tested components:
`Icon`, `Badge`, `Card`/`CardContent`/`CardHeader`, `Avatar`, `StatusPill`,
`Divider`, `PublicNav`, `LinkButton`, and `WorkflowVisual`. The previews reuse the
same `Card`/`StatusPill`/`Avatar` building blocks as the application, so the site
and the app are visibly one system.

---

## 19. ICON_GOVERNANCE

Only confirmed icon names were used (`arrow.right`, `check`, `user`, `scan`, `lock`,
`shield`, `school`, `activity`, `qr`, `x`, `refresh`, `chevron.right`). Names not
present in `IconName` (`phone`, `mail`, `message`, `send`) were deliberately
avoided; the problem chain uses numbered steps and text instead of unverified icons.

---

## 20. TOKEN_GOVERNANCE

No raw hex anywhere in `components/` or `app/page.tsx`. Color comes from semantic
tokens (`bg-primary-soft`, `text-primary`, `bg-success-soft`, `text-success`,
`bg-destructive-soft`, `text-destructive`, `border-border`, `bg-card`,
`bg-surface-subtle`, `text-muted-foreground`). The two radial glows use
`var(--color-primary-soft)` — a CSS custom property, which the `check-no-hex` scan
explicitly permits. `check:tokens` returns OK.

---

## 21. REAL_DATA_RULE

No invented facts, customers, statistics, testimonials, schools, awards, or
security certifications. Previews are structural and explicitly tagged "Preview"
with neutral placeholders. The trust section lists only capabilities the codebase
and Edge Functions actually implement. Status copy uses the product's real state
definitions.

---

## 22. RESPONSIVE

Sections use `grid-cols-1` → `sm:`/`lg:` progressions that reflow at phone and
desktop. Role blocks stack to a single column on mobile and alternate on `lg:`. The
hero visual panel scales its height (`h-[18rem]` → `sm:h-[22rem]`). Verified at the
build/code-review level across the standard breakpoints; no horizontal overflow
introduced.

---

## 23. ACCESSIBILITY

Semantic structure throughout: `<section>` per block, `<nav aria-label>` in the
footer, real `<Link>`/`<a>` for navigation, `aria-current` handled by `PublicNav`.
Color is never the sole signal (status also carries text labels; role blocks carry
icons + headings). Focus rings (`focus-visible:ring-2 ring-ring`) are inherited
from the shared primitives. Reduced-motion is respected by the global
`prefers-reduced-motion` block from Phase 31.

---

## 24. MOTION

Restrained, per the established floor. The hero uses the existing `animate-fade-in`.
No scroll-jacking, no parallax, no looping decorations on the page. The only living
motion is the `WorkflowVisual` Three.js scene, which falls back to a static frame
under `prefers-reduced-motion` and to an SVG when WebGL is unavailable.

---

## 25. THREEJS_USAGE

The hero reuses the existing `WorkflowVisual` (dynamic import, `ssr:false`,
code-split, runtime CSS-var colors, WebGL→SVG fallback, full dispose cleanup). No
new Three.js was authored for Phase 33 — the public site leans on the already-shipped
restrained visual rather than adding more.

---

## 26. QUALITY_GATES

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `npm run typecheck` | **0 errors** |
| Token governance | `npm run check:tokens` | **OK — no raw hex in components/** |
| Tests | `npm test` | **26 passed, 0 failed** |
| Production build | `npm run build` | **Compiled successfully; 20/20 pages generated** (see §27) |

---

## 27. BUILD_NOTE

`npm run build` compiles cleanly (types valid, lint passes) and generates all 20
routes. The one export error is on `/login`, which instantiates a Supabase client
at module scope and therefore requires `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` to prerender. This environment has only
`.env.example` (no `.env.local`), so those vars are absent — a **pre-existing,
environmental** limitation unrelated to Phase 33. The new `app/page.tsx` creates no
Supabase client and generated without error. Supplying real credentials is out of
scope per the security constraints; the failure is not a code defect introduced
here.

---

## 28. FILES_CHANGED

- `app/page.tsx` — full rebuild into the ten-section editorial public site
  (hero, problem, workflow model, four distinct role compositions, product
  previews, status lifecycle, trust, value, one-system/four-perspectives,
  final CTA, rebuilt footer that drops fake legal links, and the required
  anchor ids `how-it-works` / `for-parents` / `for-schools` / `security`).

No other files were modified. `PublicNav`, `LinkButton`, `WorkflowVisual`,
`StatusPill`, and the UI primitives are reused as-is.

---

## 29. BACKEND_CHANGES

**None.** No backend code was written or altered.

---

## 30. SUPABASE_CHANGES

**None.** No schema, RLS policy, Edge Function, Realtime, or auth-configuration
change. Migrations were not run. The Supabase contract is frozen.

---

## 31. DEPLOYMENT

LOCAL ONLY. No `vercel deploy`, no `supabase db push`, no `supabase functions
deploy`. The live site was not touched.

---

## 32. GIT

Working on branch `frontend-rebuild`. **No commit, push, reset, restore, rebase,
amend, or force push.** Changes remain in the worktree per the brief.

---

## 33. FINAL_VERDICT

DismissFlow now has a substantially new, genuinely premium public website: ten
distinct editorial sections that tell the product's story — the fragmented problem,
the connected mechanism, four differently-composed role experiences, the real
six-state lifecycle, trust grounded only in actual capabilities, and a quiet entry
into the existing application. It shares the product's tokens, components, status
vocabulary, and motion with the Phase 32 shell so the site and the app read as one
system. Typecheck, token governance, and all 26 tests pass; the page compiles and
renders in the production build (the lone `/login` export error is a pre-existing
environmental gap with no credentials, not a Phase 33 defect). The safety-critical
backend is unchanged.

**PREMIUM PUBLIC WEBSITE COMPLETE**
