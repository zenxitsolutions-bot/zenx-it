// Recharts writes these onto SVG presentation attributes and inline styles, where Tailwind class
// names and the color tokens in tailwind.config.ts can't reach — so the palette has to exist as
// literal values somewhere. It lives here rather than in each chart because all three charts had
// their own identical copy of the tooltip style, which is how they came to disagree with the theme.
// Values mirror the config's colors.

export const TOOLTIP_STYLE = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  fontSize: 12,
  color: "#0f172a",
};

export const LEGEND_STYLE = { fontSize: 11, color: "#64748b" };

export const CHART = {
  grid: "#e2e8f0",
  axis: "#94a3b8",
  cursorFill: "rgba(37,99,235,0.06)",
  cursorStroke: "#cbd5e1",
  accent: "#2563eb",
  ok: "#16a34a",
  danger: "#dc2626",
};

// Categorical series (enquiry sources) — blues first so the largest slices read as brand color,
// then distinct hues for the long tail. Segments are separated by a white stroke, matching the
// card they sit on.
export const SERIES = ["#2563eb", "#60a5fa", "#1e3a8a", "#93c5fd", "#16a34a", "#f59e0b", "#94a3b8"];
export const SERIES_STROKE = "#ffffff";
