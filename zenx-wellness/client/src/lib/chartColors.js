// Chart colors live here as literal hex, not as Tailwind classes or var(--color-*) lookups:
// recharts writes these straight onto SVG presentation attributes (stroke/fill), where a class
// name does nothing. Before this module every chart carried its own copy of the palette, so a
// theme change had to be repeated in five files and one always got missed — these values mirror
// the tokens in index.css and are the single place to change them.
export const CHART = {
  line: '#415d4b', // brand sage — primary data stroke
  lineSoft: '#829571', // secondary series
  lineDeep: '#7c5ce1', // tertiary series / categorical purple
  fillFrom: 'rgba(65, 93, 75, 0.20)', // area gradient top
  fillTo: 'rgba(65, 93, 75, 0)', // area gradient bottom, fully transparent
  grid: '#e5e5dc', // hairline grid, matches the shared wellness border
  axis: '#707a69', // axis labels — tertiary text
  label: '#29382e', // category tick labels that name a real thing (a person, a status)
  cursor: '#f7f5ef', // hover band behind bars/points
  dot: '#ffffff', // dot centres punch through the line, in the card color (--color-white)
  positive: '#22a06b',
  warning: '#f59e42',
  danger: '#e85d5d',
  accent: '#415d4b',
};

