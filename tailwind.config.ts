import type { Config } from "tailwindcss";

/**
 * DismissFlow — Frontend Foundation design tokens (Phase 18).
 *
 * A single, calm, premium light theme. Semantic tokens only — no
 * page-specific colors. Built on a small, extensible scale so future
 * role phases (Parent / Teacher / Gate / Admin) inherit one language.
 *
 * Convention (shadcn-style, widely understood):
 *   - `background` / `foreground`  → app canvas + default text
 *   - `card` / `popover`          → elevated surfaces
 *   - `primary` / `secondary` / `muted` / `accent` → intent colors
 *   - `destructive` / `success` / `warning` / `info` → feedback colors
 *   - `border` / `input` / `ring` → structure & focus
 *
 * Keep this file the single source of visual truth. Do not scatter
 * arbitrary hex values in components — use these tokens.
 */

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "#E4E8EF",
        input: "#E4E8EF",
        ring: "#2563EB",
        background: "#F6F8FB",
        foreground: "#0F172A",

        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A"
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A"
        },

        primary: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          active: "#1E40AF",
          soft: "#EFF4FF",
          foreground: "#FFFFFF"
        },
        secondary: {
          DEFAULT: "#F1F4F9",
          foreground: "#1E293B"
        },
        muted: {
          DEFAULT: "#F1F4F9",
          foreground: "#64748B"
        },
        accent: {
          DEFAULT: "#F1F4F9",
          foreground: "#1E293B"
        },

        destructive: {
          DEFAULT: "#DC2626",
          hover: "#B91C1C",
          soft: "#FEF2F2",
          foreground: "#FFFFFF"
        },
        success: {
          DEFAULT: "#16A34A",
          hover: "#15803D",
          soft: "#ECFDF3",
          foreground: "#FFFFFF"
        },
        warning: {
          DEFAULT: "#D97706",
          hover: "#B45309",
          soft: "#FFFAEB",
          foreground: "#FFFFFF"
        },
        info: {
          DEFAULT: "#0EA5E9",
          hover: "#0284C7",
          soft: "#E8F6FE",
          foreground: "#FFFFFF"
        }
      },

      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      },

      fontSize: {
        // Marketing/hero scale — used sparingly, never per-page.
        display: ["clamp(2.5rem, 4vw, 3.5rem)", { lineHeight: "1.05", fontWeight: "700", letterSpacing: "-0.02em" }],
        // Standard application type ramp.
        h1: ["2rem", { lineHeight: "1.15", fontWeight: "700", letterSpacing: "-0.02em" }],
        h2: ["1.5rem", { lineHeight: "1.25", fontWeight: "650", letterSpacing: "-0.01em" }],
        h3: ["1.25rem", { lineHeight: "1.3", fontWeight: "650" }],
        title: ["1.125rem", { lineHeight: "1.4", fontWeight: "600" }],
        base: ["0.9375rem", { lineHeight: "1.6" }],
        sm: ["0.875rem", { lineHeight: "1.55" }],
        xs: ["0.8125rem", { lineHeight: "1.5" }],
        caption: ["0.75rem", { lineHeight: "1.4" }],
        label: ["0.8125rem", { lineHeight: "1.4", fontWeight: "600" }],
        code: ["0.8125rem", { lineHeight: "1.6" }]
      },

      borderRadius: {
        DEFAULT: "0.625rem",
        sm: "0.375rem",
        md: "0.625rem",
        lg: "0.875rem",
        xl: "1.125rem",
        "2xl": "1.5rem",
        full: "9999px"
      },

      boxShadow: {
        sm: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)",
        card: "0 1px 2px rgba(15,23,42,0.04), 0 6px 20px -12px rgba(15,23,42,0.14)",
        popover: "0 4px 12px rgba(15,23,42,0.08), 0 18px 40px -16px rgba(15,23,42,0.20)",
        focus: "0 0 0 3px rgba(37,99,235,0.35)",
        "focus-destructive": "0 0 0 3px rgba(220,38,38,0.30)"
      },

      // A few semantic spacing tokens on top of Tailwind's default scale
      // (which already provides a consistent 4px rhythm: 1=4px, 2=8px, …).
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
        // Inherit Tailwind defaults (sm 640, md 768, lg 1024, xl 1280, 2xl 1536)
        // plus an explicit ultra-wide target called out in the spec.
        "3xl": "1920px"
      },

      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)"
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" }
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" }
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" }
        }
      },

      animation: {
        "fade-in": "fade-in 0.18s cubic-bezier(0.2, 0, 0, 1)",
        "slide-in-right": "slide-in-right 0.22s cubic-bezier(0.2, 0, 0, 1)",
        "slide-up": "slide-up 0.18s cubic-bezier(0.2, 0, 0, 1)",
        "scale-in": "scale-in 0.16s cubic-bezier(0.2, 0, 0, 1)",
        "pulse-soft": "pulse-soft 1.8s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
