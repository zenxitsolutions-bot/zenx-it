import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Light SaaS theme: cool blue-grey page, white cards, dark-navy sidebar, modern blue brand.
      //
      // The keys keep their original names because ~250 utility usages across the app read them
      // (`bg-lime` as "the accent", `ink` as "the page/behind color", `offwhite` as "the text
      // color"). Re-pointing the values here re-skins everything at once; renaming the keys would
      // mean touching every call site for no visual gain.
      colors: {
        ink: "#F5F7FB", // page background
        panel: "#FFFFFF", // cards, modals, topbar
        surface: "#F5F7FB", // faintly recessed areas inside a white card (inputs, table headers)
        border: "#E5EAF2",
        borderStrong: "#DCE3EC",
        offwhite: "#1B2B42", // primary heading/text
        muted: "#6B7A90", // secondary text
        dim: "#9AA6B5", // tertiary text and icons
        lime: "#3478D8", // primary brand blue. Name kept — 75+ usages read it as "the accent".
        limeDim: "#2563B8", // primary hover
        brandSoft: "#EAF2FF", // light blue fill behind blue icons/badges
        brand2: "#5B9BF3", // secondary blue, for chart series
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

        // Dark sidebar rail. It is the one surface in the app that stays dark, so it carries its
        // own scale rather than borrowing the light one.
        sidebar: "#0F1F35",
        sidebarHover: "#162B47",
        sidebarText: "#D1D9E6",
        sidebarBorder: "#1C3251",

        // Soft pastel grounds for KPI icons and status tints.
        tintBlue: "#EAF2FF",
        tintPurple: "#F1EBFF",
        tintOrange: "#FFF3E5",
        tintGreen: "#E8F7F0",
        tintRed: "#FDECEC",
      },
      // One family for the whole portal. `display` is kept as a separate key pointing at the same
      // stack so the ~40 existing `font-display` usages keep compiling — it now means "the heavier
      // typographic role", not "a second typeface", and the weight is what distinguishes it.
      fontFamily: {
        display: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // A 0.45-alpha black shadow reads as a dark smudge against white — on a light ground the
        // lift has to come from a hairline border plus a short, warm-cast shadow.
        panel: "0 1px 2px rgba(27,43,66,0.04), 0 8px 24px rgba(27,43,66,0.06)",
        // Resting/hover pair for cards. The hover state lifts the shadow rather than growing it,
        // so a grid of cards doesn't visibly reflow when the pointer crosses it.
        card: "0 1px 2px rgba(27,43,66,0.04), 0 4px 12px rgba(27,43,66,0.05)",
        cardHover: "0 2px 4px rgba(27,43,66,0.06), 0 12px 28px rgba(27,43,66,0.10)",
        // Popovers and dropdowns sit above the page and need to read as detached.
        float: "0 12px 32px rgba(27,43,66,0.14), 0 2px 8px rgba(27,43,66,0.08)",
      },
      borderRadius: {
        // 14px sits in the spec's 12–16px band. `xl2` is the app's card radius in ~13 places, so
        // retuning it here modernises every card at once rather than touching each call site.
        xl2: "14px",
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
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(52,120,216,0.35)" },
          "50%": { boxShadow: "0 0 0 6px rgba(52,120,216,0)" },
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
