import type { Config } from "tailwindcss";

// DismissFlow design tokens — translated from Docs/design/DESIGN.md.
// Source of truth: the Stitch export, which is itself derived from the PRD
// visual direction. Keep this in sync with DESIGN.md if the system is updated.

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC",
        surface: "#FFFFFF",
        "surface-muted": "#EFF4FF",
        "surface-container": "#E5EEFF",
        hairline: "#E2E8F0",
        ink: {
          DEFAULT: "#0B1C30",
          muted: "#454655",
          subtle: "#64748B"
        },
        primary: {
          DEFAULT: "#2D3FE2",
          soft: "#DFE0FF"
        },
        // Semantic status — used sparingly per the design system.
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#BA1A1A"
      },
      fontFamily: {
        // iOS-first system stack; Plus Jakarta Sans is the design system's
        // web fallback for Android/desktop where SF is unavailable.
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "SF Pro Display",
          "ui-sans-serif",
          "system-ui",
          "Plus Jakarta Sans",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      },
      fontSize: {
        // iOS HIG–aligned scale. Sizes in pt, line-heights tight.
        // Large Title 34, Title 1 28, Title 2 22, Title 3 20,
        // Headline 17/semibold, Body 17, Callout 16, Subhead 15,
        // Footnote 13, Caption 1 12, Caption 2 11.
        "ios-large-title": ["2.125rem", { lineHeight: "1.15", letterSpacing: "0.37px", fontWeight: "700" }],
        "ios-title-1": ["1.75rem", { lineHeight: "1.2", letterSpacing: "0.36px", fontWeight: "700" }],
        "ios-title-2": ["1.375rem", { lineHeight: "1.25", letterSpacing: "0.35px", fontWeight: "700" }],
        "ios-title-3": ["1.25rem", { lineHeight: "1.3", letterSpacing: "0.34px", fontWeight: "600" }],
        "ios-headline": ["1.0625rem", { lineHeight: "1.35", letterSpacing: "-0.41px", fontWeight: "600" }],
        "ios-body": ["1.0625rem", { lineHeight: "1.4", letterSpacing: "-0.41px", fontWeight: "400" }],
        "ios-callout": ["1rem", { lineHeight: "1.35", letterSpacing: "-0.32px", fontWeight: "400" }],
        "ios-subhead": ["0.9375rem", { lineHeight: "1.35", letterSpacing: "-0.24px", fontWeight: "400" }],
        "ios-footnote": ["0.8125rem", { lineHeight: "1.4", letterSpacing: "-0.08px", fontWeight: "400" }],
        "ios-caption-1": ["0.75rem", { lineHeight: "1.35", letterSpacing: "0", fontWeight: "500" }],
        "ios-caption-2": ["0.6875rem", { lineHeight: "1.3", letterSpacing: "0.07px", fontWeight: "500" }]
      },
      borderRadius: {
        sm: "0.5rem",
        DEFAULT: "0.75rem",
        md: "1rem",
        lg: "1.5rem",
        xl: "1.75rem",
        "2xl": "1.75rem",
        "3xl": "1.75rem"
      },
      boxShadow: {
        // Soft-ambient depth per DESIGN.md §Elevation.
        card: "0 10px 40px rgba(0,0,0,0.04)",
        "card-soft": "0 8px 30px rgba(0,0,0,0.03)",
        ambient: "0 10px 15px -3px rgba(0,0,0,0.05)"
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        scan: {
          "0%, 100%": { transform: "translateY(0)", opacity: "0" },
          "10%, 90%": { opacity: "1" },
          "50%": { transform: "translateY(160px)", opacity: "1" }
        },
        "soft-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" }
        }
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        scan: "scan 3s ease-in-out infinite",
        "soft-pulse": "soft-pulse 1.8s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
