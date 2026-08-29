import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a09",
        panel: "#11120f",
        surface: "#151613",
        border: "#ffffff18",
        borderStrong: "#ffffff2e",
        offwhite: "#f4f1e9",
        muted: "#a4a59e",
        dim: "#6f716b",
        lime: "#d7ff42",
        limeDim: "#9fbf2e",
        danger: "#ff6b6b",
        warn: "#ffb84d",
        ok: "#7fe08a",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        sans: ["'DM Sans'", "sans-serif"],
      },
      boxShadow: {
        panel: "0 30px 80px rgba(0,0,0,0.45)",
      },
      borderRadius: {
        xl2: "10px",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(215,255,66,0.35)" },
          "50%": { boxShadow: "0 0 0 6px rgba(215,255,66,0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn .35s ease both",
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
