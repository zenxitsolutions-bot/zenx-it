// Recharts writes these onto SVG presentation attributes and inline styles, where Tailwind class
// names and the color tokens in tailwind.config.ts can't reach — so the palette has to exist as
// literal values somewhere. It lives here rather than in each chart because all three charts had
// their own identical copy of the tooltip style, which is how they came to disagree with the theme.
// Values mirror the config's colors.

export const TOOLTIP_STYLE = {
  background: "#FFFFFF",
  border: "1px solid #E5EAF2",
  borderRadius: 10,
  boxShadow: "0 12px 32px rgba(27,43,66,0.12)",
  fontSize: 12,
  color: "#1B2B42",
};

export const LEGEND_STYLE = { fontSize: 11, color: "#6B7A90" };

export const CHART = {
  grid: "#E9EDF3",
  axis: "#9AA6B5",
  cursorFill: "rgba(52,120,216,0.06)",
  cursorStroke: "#DCE3EC",
  accent: "#3478D8",
  ok: "#22A06B",
  danger: "#E85D5D",
  warn: "#F59E42",
  purple: "#7C5CE1",
};

// Categorical series (enquiry sources): brand blue first so the largest slices read as ZenX blue,
// then the rest of the status palette, then a neutral for the long tail. Slices are separated by a
// white stroke, matching the card they sit on.
export const SERIES = ["#3478D8", "#7C5CE1", "#5B9BF3", "#22A06B", "#F59E42", "#E85D5D", "#9AA6B5"];
export const SERIES_STROKE = "#FFFFFF";
