// Chart colors live here as literal hex, not as Tailwind classes or var(--color-*) lookups:
// recharts writes these straight onto SVG presentation attributes (stroke/fill), where a class
// name does nothing. Before this module every chart carried its own copy of the palette, so a
// theme change had to be repeated in five files and one always got missed — these values mirror
// the tokens in index.css and are the single place to change them.
export const CHART = {
  line: '#087f6b', // brand green — primary data stroke
  lineSoft: '#159a7c', // medium green — secondary series
  lineDeep: '#3e9bd1', // soft blue — tertiary series, and hydration wherever it is charted
  fillFrom: 'rgba(8, 127, 107, 0.20)', // area gradient top
  fillTo: 'rgba(8, 127, 107, 0)', // area gradient bottom, fully transparent
  grid: '#e1ece8', // hairline grid, matches --color-line
  axis: '#8a9b98', // axis labels — muted green-grey, decorative weight only
  label: '#102a2a', // category tick labels that name a real thing (a person, a status)
  cursor: '#eef7f3', // hover band behind bars/points
  dot: '#ffffff', // dot centres punch through the line, in the card color (--color-white)
  positive: '#157a4e', // leaf green, for categorical series only
  warning: '#e9a23b', // muted amber, for categorical series only
};
