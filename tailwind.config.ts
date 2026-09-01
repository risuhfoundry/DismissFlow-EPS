import type { Config } from "tailwindcss";

/**
 * DismissFlow — Visual Design System (Phase 19).
 *
 * A single, calm, premium light theme for a serious school-operations platform.
 * Semantic tokens only — no page-specific colors, no raw hex in components.
 *
 * Tokens are grouped by ROLE so every future role phase (Parent / Teacher /
 * Gate / Admin) inherits one language:
 *   - canvas / surfaces      → background, card, surface-subtle, surface-elevated
 *   - structure              → border, border-strong, input, ring
 *   - text                   → foreground (=text-primary), content.{secondary,muted,inverse}
 *   - intent (primary)      → primary.{DEFAULT,hover,active,subtle,foreground}
 *   - feedback               → success/warning/danger/info .{DEFAULT,hover,subtle,foreground}
 *
 * Convention: keep this file the single source of visual truth. Components must
 * use these tokens, never raw hex (enforced by `npm run check:tokens`).
 */

// Shared ink + surface ramp (cool, slightly blue-neutral — calm, premium).
const INK = {
  primary: "#0E1726", // main text / headings
  secondary: "#3C4658", // supporting text
  // Darkened from #697586 (~4.0:1) to #5B6573 (~4.7:1) so caption/metadata
  // text clears WCAG AA 4.5:1 at the 12px caption size.
  muted: "#5B6573", // metadata, captions
  inverse: "#FFFFFF" // text on colored surfaces
};

const SURFACE = {
  background: "#F5F7FA", // app canvas
  card: "#FFFFFF", // default elevated surface
  subtle: "#EEF1F6", // recessed panel / secondary surface
  elevated: "#FFFFFF" // floating surface (paired with shadow-popover)
};

// Refined, trustworthy blue — confident and slightly indigo, not generic.
// `soft` and `subtle` are aliases (both provided so existing `-soft` class
// names keep working and the spec's `-subtle` naming is honored).
// `on-soft` is the text color used ON the soft tint (passes WCAG AA at the
// 12px badge size — the mid-tone base colors do not).
const PRIMARY = {
  DEFAULT: "#2C56D6",
  hover: "#2348B8",
  active: "#1D3C9B",
  soft: "#EEF2FE", // tint for selected / active backgrounds
  subtle: "#EEF2FE",
  onSoft: "#1D3C9B", // text on soft tint
  foreground: "#FFFFFF" // text on solid primary
};

// Feedback colors — restrained, accessible, distinct from primary.
// `on-soft` = dark text shade for the tinted `StatusBadge` (white-on-tint fails
// AA; mid-tone-on-tint fails for warning/danger). `foreground` stays white for
// solid surfaces (buttons, solid badges).
const FEEDBACK = {
  success: { DEFAULT: "#16864A", hover: "#116B3B", soft: "#E7F5EE", subtle: "#E7F5EE", onSoft: "#0F6B40", foreground: "#FFFFFF" },
  warning: { DEFAULT: "#B7791A", hover: "#956112", soft: "#FBF3E2", subtle: "#FBF3E2", onSoft: "#8A5310", foreground: "#FFFFFF" },
  danger: { DEFAULT: "#D23B3B", hover: "#B22B2B", soft: "#FCEBEB", subtle: "#FCEBEB", onSoft: "#B22B2B", foreground: "#FFFFFF" },
  info: { DEFAULT: "#0E84B4", hover: "#0A6C95", soft: "#E5F3FA", subtle: "#E5F3FA", onSoft: "#0A6C95", foreground: "#FFFFFF" }
};

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Canvas + surfaces
        background: SURFACE.background,
        card: { DEFAULT: SURFACE.card, foreground: INK.primary },
        popover: { DEFAULT: SURFACE.elevated, foreground: INK.primary },
        "surface-subtle": SURFACE.subtle,
        "surface-elevated": SURFACE.elevated,

        // Structure
        border: "#E2E6EE",
        "border-strong": "#CDD3DF",
        input: "#E2E6EE",
        ring: PRIMARY.DEFAULT,

        // Text roles
        foreground: INK.primary,
        "muted-foreground": INK.muted,
        content: {
          DEFAULT: INK.primary,
          primary: INK.primary,
          secondary: INK.secondary,
          muted: INK.muted,
          inverse: INK.inverse
        },

        // Intent
        primary: PRIMARY,
        secondary: { DEFAULT: SURFACE.subtle, foreground: INK.secondary },
        muted: { DEFAULT: SURFACE.subtle, foreground: INK.muted },
        accent: { DEFAULT: SURFACE.subtle, foreground: INK.secondary },

        // Feedback
        success: FEEDBACK.success,
        warning: FEEDBACK.warning,
        destructive: FEEDBACK.danger,
        danger: FEEDBACK.danger,
        info: FEEDBACK.info
      },

      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        // Editorial display face — a high-quality system serif stack (no network
        // fetch, no font files). Pairs a humanist serif against the Geist grotesque
        // for the calm, premium, editorial product voice. Used only for display
        // headlines, never body copy.
        serif: [
          "Iowan Old Style",
          "Palatino Linotype",
          "Palatino",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif"
        ]
      },

      fontSize: {
        // Editorial hero — the largest, calmest headline. Serif, generous.
        hero: ["clamp(2.75rem, 5.4vw, 4.75rem)", { lineHeight: "1.03", fontWeight: "600", letterSpacing: "-0.022em" }],
        // Section display — editorial sub-headline.
        display: ["clamp(2.25rem, 3.6vw, 3.25rem)", { lineHeight: "1.06", fontWeight: "700", letterSpacing: "-0.022em" }],
        // Dialog / drawer titles (legacy alias for the old `title` size).
        title: ["1.375rem", { lineHeight: "1.25", fontWeight: "650", letterSpacing: "-0.015em" }],
        // Application type ramp.
        h1: ["1.875rem", { lineHeight: "1.18", fontWeight: "700", letterSpacing: "-0.02em" }],
        h2: ["1.4375rem", { lineHeight: "1.24", fontWeight: "650", letterSpacing: "-0.015em" }],
        h3: ["1.1875rem", { lineHeight: "1.3", fontWeight: "650" }],
        h4: ["1.0625rem", { lineHeight: "1.35", fontWeight: "600" }],
        "body-lg": ["1.0625rem", { lineHeight: "1.65" }],
        base: ["0.9375rem", { lineHeight: "1.6" }],
        sm: ["0.875rem", { lineHeight: "1.55" }],
        xs: ["0.8125rem", { lineHeight: "1.5" }],
        caption: ["0.75rem", { lineHeight: "1.45" }],
        label: ["0.8125rem", { lineHeight: "1.4", fontWeight: "600" }],
        overline: ["0.6875rem", { lineHeight: "1.4", fontWeight: "600", letterSpacing: "0.08em" }],
        code: ["0.8125rem", { lineHeight: "1.6" }]
      },

      borderRadius: {
        DEFAULT: "0.5rem",
        sm: "0.375rem", // chips, small badges
        md: "0.5rem", // inputs, buttons
        lg: "0.75rem", // cards, dropdowns
        xl: "1rem", // modals, large surfaces
        "2xl": "1.25rem",
        full: "9999px"
      },

      boxShadow: {
        // Restrained elevation — most surfaces stay flat with a hairline border.
        sm: "0 1px 2px rgba(14,23,38,0.04), 0 1px 3px rgba(14,23,38,0.05)",
        card: "0 1px 2px rgba(14,23,38,0.04), 0 8px 24px -16px rgba(14,23,38,0.18)",
        popover: "0 6px 16px rgba(14,23,38,0.08), 0 24px 48px -20px rgba(14,23,38,0.22)",
        focus: "0 0 0 3px rgba(44,86,214,0.30)",
        "focus-danger": "0 0 0 3px rgba(210,59,59,0.28)"
      },

      // Semantic spacing on top of Tailwind's 4px rhythm.
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem"
      },

      maxWidth: {
        content: "80rem", // 1280px — default app content width
        reading: "44rem"
      },

      screens: {
        "3xl": "1920px"
      },

      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)"
      },

      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in-right": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "slide-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "scale-in": { from: { opacity: "0", transform: "scale(0.97)" }, to: { opacity: "1", transform: "scale(1)" } },
        "overlay-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "pulse-soft": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.5" } }
      },

      animation: {
        "fade-in": "fade-in 0.18s cubic-bezier(0.2, 0, 0, 1)",
        "slide-in-right": "slide-in-right 0.24s cubic-bezier(0.2, 0, 0, 1)",
        "slide-up": "slide-up 0.18s cubic-bezier(0.2, 0, 0, 1)",
        "scale-in": "scale-in 0.16s cubic-bezier(0.2, 0, 0, 1)",
        "overlay-in": "overlay-in 0.18s cubic-bezier(0.2, 0, 0, 1)",
        "pulse-soft": "pulse-soft 1.8s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
