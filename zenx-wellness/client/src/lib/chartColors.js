// Chart colors live here as literal hex, not as Tailwind classes or var(--color-*) lookups:
// recharts writes these straight onto SVG presentation attributes (stroke/fill), where a class
// name does nothing. Before this module every chart carried its own copy of the palette, so a
// theme change had to be repeated in five files and one always got missed — these values mirror
// the tokens in index.css and are the single place to change them.
export const CHART = {
  line: '#2563eb', // brand blue — primary data stroke
  lineSoft: '#60a5fa', // lighter blue — secondary series
  lineDeep: '#1e3a8a', // navy blue — tertiary series
  fillFrom: 'rgba(37, 99, 235, 0.28)', // area gradient top
  fillTo: 'rgba(37, 99, 235, 0)', // area gradient bottom, fully transparent
  grid: '#e2e8f0', // hairline grid, matches --color-line
  axis: '#64748b', // axis labels, matches --muted-foreground
  cursor: '#dbeafe', // hover band behind bars/points
  dot: '#ffffff', // dot centres punch through the line
  positive: '#16a34a', // green, for categorical series only
  warning: '#f59e0b', // amber, for categorical series only
};
