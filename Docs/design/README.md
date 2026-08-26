# DismissFlow — Design

This folder holds the source-of-truth design assets (Stitch exports) and
notes for translating them into the Next.js implementation.

## Source of truth

The visual language is owned by **Stitch** (`DismissFlow Digital Pickup
System`, project id `15289458904595449903`). Each screen is exported as a
zip containing:

- `code.html` — the generated markup, kept as a reference for layout and
  animation intent. **Do not paste it directly into the app.**
- `DESIGN.md` — color tokens, typography scale, spacing, elevation, and
  component guidance. The `tailwind.config.ts` is generated from this file.
- `screen.png` — the rendered screen, used for visual diffs.

## How a Stitch screen becomes a page

1. Export the screen zip from Stitch and extract it into
   `Docs/design/stitch-exports/<screen-slug>/`.
2. Update `tailwind.config.ts` and `app/globals.css` if the design system
   changes (new tokens, type sizes, motion).
3. Build the page under `app/<role>/page.tsx` using the existing primitives
   in `components/ui/`. Reuse `<NavHeader />`, `<TabBar />`, `<Icon />`,
   `<StatusPill />`, `<PrimaryButton />`, `<Avatar />` instead of inventing
   new shapes.
4. Wire live data to the Supabase client in `lib/supabase/client.ts` and the
   dismissal state types in `lib/dismissal/state.ts`. The browser never
   decides QR validity, authorization, or state transitions — that is the
   Edge Function's job. See `Docs/architecture.md` §5.1.

## iOS feel

The whole app leans iOS-first: SF system font stack (with Plus Jakarta Sans
as the web fallback), 1px hairlines, frosted glass chrome via `.glass`,
spring tap affordance via `.tap-spring`, iOS HIG–aligned type scale
(`text-ios-large-title` … `text-ios-caption-2`), 88pt bottom tab bar with
safe-area insets, and `overscroll-behavior-y: contain` for rubber-band
scrolling.

## Sibling docs

- `Docs/PRD.md` — product requirements
- `Docs/architecture.md` — system architecture
