// Chart colors live here as literal hex, not as Tailwind classes or var(--color-*) lookups:
// recharts writes these straight onto SVG presentation attributes (stroke/fill), where a class
// name does nothing. Before this module every chart carried its own copy of the palette, so a
// theme change had to be repeated in five files and one always got missed — these values mirror
// the tokens in index.css and are the single place to change them.
export const CHART = {
  line: '#3478d8', // brand blue — primary data stroke
  lineSoft: '#5b9bf3', // secondary series
  lineDeep: '#7c5ce1', // tertiary series / categorical purple
  fillFrom: 'rgba(52, 120, 216, 0.20)', // area gradient top
  fillTo: 'rgba(52, 120, 216, 0)', // area gradient bottom, fully transparent
  grid: '#e9edf3', // hairline grid, matches admin chartTheme
  axis: '#9aa6b5', // axis labels — tertiary text
  label: '#1b2b42', // category tick labels that name a real thing (a person, a status)
  cursor: '#f5f7fb', // hover band behind bars/points
  dot: '#ffffff', // dot centres punch through the line, in the card color (--color-white)
  positive: '#22a06b',
  warning: '#f59e42',
  danger: '#e85d5d',
  accent: '#3478d8',
};
