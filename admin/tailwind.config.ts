import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Oat-and-sage theme, shared with the marketing site and wellness portal.
      //
      // The keys keep their original names because ~250 utility usages across the app read them
      // (`bg-lime` as "the accent", `ink` as "the page/behind color", `offwhite` as "the text
      // color"). Re-pointing the values here re-skins everything at once; renaming the keys would
      // mean touching every call site for no visual gain.
      colors: {
        ink: "#F7F5EF", // cream page background
        panel: "#FFFFFF", // cards, modals, topbar
        surface: "#F7F5EF", // faintly recessed areas inside a white card (inputs, table headers)
        border: "#E5E5DC",
        borderStrong: "#E1E5D8",
        offwhite: "#29382E", // forest heading/text
        muted: "#707A69", // secondary text
        dim: "#8A9084", // tertiary text and icons
        lime: "#415D4B", // forest green accent. Name kept — 75+ usages read it as "the accent".
        limeDim: "#344E3C", // primary hover
        brandSoft: "#E9EDDF", // sage fill behind icons/badges
        brand2: "#829571", // secondary sage, for chart series
        purple: "#7C5CE1", // Contacted status + secondary chart series

        // Status/semantic FILL colors, exactly as specified. These are correct for dots, chart
        // series, progress bars and solid buttons.
        danger: "#E85D5D",
        warn: "#F59E42",
        ok: "#22A06B",
        // …and their text-safe counterparts. The fill values above are far too light to carry
        // small text on white (orange lands at 2.13:1, green 3.33, red 3.41), so anything that
        // *writes* in a semantic color uses these instead — same hue, dark enough to read.
        dangerInk: "#B93232",
        warnInk: "#A35700",
        okInk: "#157A4E",

        // Light botanical rail, matching the wellness portal.
        sidebar: "#F5F6EF",
        sidebarHover: "#E4E9DC",
        sidebarText: "#56634E",
        sidebarBorder: "#E1E5D8",

        // Soft pastel grounds for KPI icons and status tints.
        tintBlue: "#E9EDDF",
        tintPurple: "#F1EBFF",
        tintOrange: "#FFF3E5",
        tintGreen: "#E8F7F0",
        tintRed: "#FDECEC",
      },
      // Display is Caslon for titles/wordmark; body copy is DM Sans.
      fontFamily: {
        display: ["'Libre Caslon Display'", "Georgia", "serif"],
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // A 0.45-alpha black shadow reads as a dark smudge against white — on a light ground the
        // lift has to come from a hairline border plus a short, warm-cast shadow.
        panel: "0 1px 2px rgba(55,64,43,0.04), 0 8px 24px rgba(55,64,43,0.06)",
        card: "0 1px 2px rgba(55,64,43,0.04), 0 4px 12px rgba(55,64,43,0.05)",
        cardHover: "0 2px 4px rgba(55,64,43,0.06), 0 12px 28px rgba(55,64,43,0.10)",
        float: "0 12px 32px rgba(55,64,43,0.14), 0 2px 8px rgba(55,64,43,0.08)",
      },
      borderRadius: {
        xl2: "16px",
        pill: "999px",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Modals and dropdowns: a short rise plus a hair of scale reads as "placed" rather than
        // "appeared". Kept under 200ms so it never sits between the user and the content.
        popIn: {
          "0%": { opacity: "0", transform: "translateY(-4px) scale(.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(65,93,75,0.35)" },
          "50%": { boxShadow: "0 0 0 6px rgba(65,93,75,0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn .35s ease both",
        popIn: "popIn .16s cubic-bezier(.16,1,.3,1) both",
        shimmer: "shimmer 1.6s infinite",
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
