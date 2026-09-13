// Serving suggestions, visually reviewed against each dish. Sources: docs/RECIPE_PHOTOS.md.
const unsplash = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;

export const RECIPE_PHOTOS = {
  'Berry & chia breakfast bowl': 'https://images.pexels.com/photos/9026809/pexels-photo-9026809.jpeg?auto=compress&w=900',
  'Rainbow quinoa nourish bowl': unsplash('1623428187442-b633f414aedc'),
  'Lentil & veggie comfort soup': unsplash('1734772682896-2db9bf254596'),
  'Apple slices with nut butter': unsplash('1642339800118-eb551cfa1434'),
};
