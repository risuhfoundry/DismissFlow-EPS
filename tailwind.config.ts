import type { Config } from "tailwindcss";

// DismissFlow design tokens — Revora structure + Kernel motion + blue accent.
// Source: Docs/design/README.md. Update that file when the system changes.

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#080706",
        panel: {
          DEFAULT: "#0A0A0A",
          alt: "#14110F",
          high: "#1B1714"
        },
        bone: "#F1E8DC",
        muted: "#91877E",
        line: "rgba(241,232,220,0.14)",
        "line-hot": "rgba(59,130,246,0.56)",
        accent: {
          DEFAULT: "#3B82F6",
          deep: "#1D4ED8",
          soft: "rgba(59,130,246,0.12)",
          glow: "rgba(59,130,246,0.25)"
        },
        success: "#B7EF42",
        danger: "#FF3B20",
        warn: "#FEBC2E"
      },
      fontFamily: {
        // Revora display, Inter body, Geist Mono metadata.
        display: [
          '"Barlow Condensed"',
          '"Arial Narrow"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif"
        ],
        mono: [
          "var(--font-geist-mono)",
          '"Geist Mono"',
          '"JetBrains Mono"',
          "Consolas",
          "ui-monospace",
          "monospace"
        ]
      },
      fontSize: {
        // Display scale (Barlow Condensed, all-caps).
        "display-xl": ["clamp(70px,8.7vw,142px)", { lineHeight: "0.745", letterSpacing: "-0.047em", fontWeight: "800" }],
        "display-lg": ["clamp(62px,7vw,112px)", { lineHeight: "0.8", letterSpacing: "-0.035em", fontWeight: "750" }],
        "display-md": ["clamp(40px,4.5vw,64px)", { lineHeight: "0.85", letterSpacing: "-0.03em", fontWeight: "700" }],
        // Mono scale — 7–11pt is the working range for metadata.
        "mono-xs": ["7px", { lineHeight: "1.4", letterSpacing: "0.12em" }],
        "mono-sm": ["9px", { lineHeight: "1.4", letterSpacing: "0.1em" }],
        "mono-md": ["11px", { lineHeight: "1.4", letterSpacing: "0.08em" }]
      },
      borderRadius: {
        // Kernel-style cards, but tighter.
        DEFAULT: "0.5rem",
        sm: "0.25rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.25rem"
      },
      boxShadow: {
        // Subtle ambient + accent glow.
        panel: "0 20px 60px rgba(0,0,0,0.35)",
        ambient: "0 10px 15px -3px rgba(0,0,0,0.05)",
        "accent-glow": "0 0 30px rgba(59,130,246,0.25)"
      },
      keyframes: {
        "reveal-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" }
        },
        scan: {
          "0%, 100%": { transform: "translateY(0)", opacity: "0" },
          "10%, 90%": { opacity: "1" },
          "50%": { transform: "translateY(160px)", opacity: "1" }
        },
        "gradient-xy": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" }
        }
      },
      animation: {
        "reveal-up": "reveal-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        scan: "scan 3s ease-in-out infinite",
        "gradient-xy": "gradient-xy 6s ease infinite"
      }
    }
  },
  plugins: []
};

export default config;
