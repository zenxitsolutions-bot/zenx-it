import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Light blue/white theme, matching the ZenX dashboard design and the wellness app's palette
      // (zenx-wellness/client/src/index.css).
      //
      // This portal was originally a dark theme, and the flip to light is a straight inversion of
      // this table rather than a rewrite of the components: every pairing in the app is
      // background-token + foreground-token (`bg-lime text-ink`, `bg-panel text-offwhite`), so
      // swapping which end of the scale `ink` and `offwhite` sit at keeps all of them legible.
      // That's also why the two keys keep their names despite now meaning the opposite shade —
      // `ink` is still "the page/behind color" and `offwhite` still "the text color", which is how
      // all ~100 usages read them.
      colors: {
        ink: "#f4f7fc", // page background, and text on a colored fill
        panel: "#ffffff", // cards, sidebar, modals
        surface: "#f8fafc", // faintly recessed panels
        border: "#e2e8f0",
        borderStrong: "#cbd5e1",
        offwhite: "#0f172a", // primary text (navy)
        muted: "#64748b", // secondary text
        dim: "#94a3b8", // tertiary text, icons
        lime: "#2563eb", // accent: brand blue. Name kept — 130 usages read it as "the accent".
        limeDim: "#1d4ed8",
        danger: "#dc2626",
        warn: "#f59e0b",
        ok: "#16a34a",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        sans: ["'DM Sans'", "sans-serif"],
      },
      boxShadow: {
        // A 0.45-alpha black shadow reads as a dark smudge against white — on a light ground the
        // lift has to come from a hairline border plus a short, cool shadow.
        panel: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)",
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
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(37,99,235,0.35)" },
          "50%": { boxShadow: "0 0 0 6px rgba(37,99,235,0)" },
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
