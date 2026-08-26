# DismissFlow — Design

This folder documents the visual system for the DismissFlow web app. The
direction is a hybrid: **Revora/Revora's command-deck structure** (mono
metadata, hairline 1px borders, status pulses, capability grid) +
**Kernel Agent's motion language** (cursor glow, noise, Framer Motion
reveals, bento layout, gradient-xy) + a **soft kernel-blue accent** that
reads "school-appropriate" without the aggression of mars-red.

## Source of truth

The visual language is owned by two reference projects on this machine:

- `friday/ares-website` — Revora / Ares. Editorial brutalist. Color
  tokens, type stack, command-deck pattern, capability grid. (Don't
  borrow the indigo or the iOS direction — they're a different project.)
- `Desktop/kernalagent/Frontend` — Kernel Agent by ShawnTheCreator. Bento
  grid, cursor glow, cubic-bezier reveals, Lenis smooth scroll, Framer
  Motion page transitions. Pure-black ground plane.

Both are dark. The DismissFlow ground plane is `#080706` (Revora ink) with
`#0A0A0A` cards (Kernel). The accent is `#3B82F6` (Kernel blue) — calm,
trustworthy, and not the educational-toy pastels of a child app.

## Type stack

- **Display**: Barlow Condensed, 600/700/800, all-caps, tight tracking.
  Used for page titles, hero text, command-deck headers.
- **Body**: Inter, 400/500/600. Used for content.
- **Mono**: Geist Mono, 7–9pt caps. Used for status, IDs, timestamps,
  section kickers, metadata.

## Color tokens

| Token | Hex | Use |
| ----- | --- | --- |
| `ink` | `#080706` | Ground plane |
| `panel` | `#0A0A0A` | Cards, panels |
| `panel-2` | `#14110F` | Elevated panels (Revora) |
| `bone` | `#F1E8DC` | Primary text (Revora) |
| `muted` | `#91877E` | Secondary text |
| `line` | `rgba(241,232,220,0.14)` | Hairline borders |
| `line-hot` | `rgba(59,130,246,0.56)` | Active borders |
| `accent` | `#3B82F6` | Primary accent (Kernel blue) |
| `accent-deep` | `#1D4ED8` | Accent hover |
| `success` | `#B7EF42` | Live / dismissed (Revora green) |
| `danger` | `#FF3B20` | Rejected / invalid (Revora mars) |

## Motion

- **Reveal**: `cubic-bezier(0.16, 1, 0.3, 1)`, 0.6s, with optional stagger.
- **Hover lift**: `translateY(-2px)` over 200ms.
- **Cursor glow**: 600px radial following the pointer, low opacity.
- **Noise overlay**: fixed SVG turbulence at 0.04 opacity.
- **Status pulse**: mono dot with `box-shadow: 0 0 12px <color>`.
- **Marquee / signal strip**: optional for the live request ticker.

## How a new screen becomes a page

1. Decide the role (`parent/`, `gate/`, `teacher/`, `admin/`) per the
   architecture.
2. Pick a layout primitive: `CommandDeck` (multi-pane with mono header),
   `BentoGrid` (asymmetric cards), or `Stack` (vertical capability list).
3. Compose with `Panel`, `MonoLabel`, `StatusPill`, `PrimaryButton`, and
   `SectionShell` from `components/ui/`. Don't invent new shapes.
4. Wire to `lib/supabase/client.ts` + the state machine in
   `lib/dismissal/state.ts`. The browser never decides validity.

## Sibling docs

- `Docs/PRD.md` — product requirements
- `Docs/architecture.md` — system architecture
