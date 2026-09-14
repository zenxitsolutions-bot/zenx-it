// Recharts writes these onto SVG presentation attributes and inline styles, where Tailwind class
// names and the color tokens in tailwind.config.ts can't reach — so the palette has to exist as
// literal values somewhere. It lives here rather than in each chart because all three charts had
// their own identical copy of the tooltip style, which is how they came to disagree with the theme.
// Values mirror the config's colors.

export const TOOLTIP_STYLE = {
  background: "#FFFFFF",
  border: "1px solid #E5E5DC",
  borderRadius: 10,
  boxShadow: "0 12px 32px rgba(55,64,43,0.12)",
  fontSize: 12,
  color: "#29382E",
};

export const LEGEND_STYLE = { fontSize: 11, color: "#707A69" };

export const CHART = {
  grid: "#E5E5DC",
  axis: "#707A69",
  cursorFill: "rgba(65,93,75,0.06)",
  cursorStroke: "#E1E5D8",
  accent: "#415D4B",
  ok: "#22A06B",
  danger: "#E85D5D",
  warn: "#F59E42",
  purple: "#7C5CE1",
};

export const SERIES = ["#415D4B", "#7C5CE1", "#829571", "#22A06B", "#F59E42", "#E85D5D", "#8A9084"];
export const SERIES_STROKE = "#FFFFFF";
