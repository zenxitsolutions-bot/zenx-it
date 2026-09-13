# Recipe photo sources

Selected and visually reviewed on 2026-09-12. Photos illustrate serving suggestions; the recipe ingredients and nutrition remain authoritative. These are stock photos, not photographs of the exact prepared recipes.

| Recipe | Photo source | License |
| --- | --- | --- |
| Berry & chia breakfast bowl | [I Own My Food Art](https://www.pexels.com/photo/a-close-up-shot-of-a-smoothie-bowl-9026809/) | Pexels |
| Rainbow quinoa nourish bowl | [Sonny Mauricio](https://unsplash.com/photos/smbmkO3mwfc) | Unsplash |
| Lentil & veggie comfort soup | [Lentil soup](https://unsplash.com/photos/SmejxSpxsbE) | Unsplash |
| Apple slices with nut butter | [Aasiya Khan](https://unsplash.com/photos/F-ReDCrjQbo) | Unsplash |

The berry image shows chia and berries; quinoa shows quinoa, chickpeas and vegetables; soup shows cooked lentil soup; apple shows slices with nut butter. Garnishes and varieties may differ.

Run `node src/db/backfillRecipePhotos.js legacy-practice` from server to fill missing photos in that tenant only. The operation is idempotent and preserves every existing image. New demo seed recipes use the same mappings. Unidentified test recipes are intentionally left alone. No full seed or catalog synchronization is needed.
