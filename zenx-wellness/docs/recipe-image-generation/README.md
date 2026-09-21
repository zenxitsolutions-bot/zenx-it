# Individual recipe images

The target is one unique image for each of the 878 recipes in `manifest.json`.
That manifest preserves each recipe's ingredients, instructions, portion and
the exact prompt submitted to the built-in image generation tool. No API/CLI
generation is used.

Images are stored under `client/public/images/recipe-catalog/` with numbered,
recipe-specific filenames. The older 13 unnumbered family images are retained
as unused drafts; they are not counted as completed individual recipe images.

The client and server `generatedRecipeImages.js` registries contain only saved,
reviewed images. Pending recipes return no catalog image and use the UI emoji.
The client also resolves shared stock catalog photos through this registry so
existing database entries receive the exact matching image after deployment.
Uploaded custom photos are preserved.

Do not run the full catalog sync to update only photographs: it also rewrites
recipe content. No production database changes have been made for this work.

Completion requires 878 distinct registry URLs and image files, visual review
against the recipe, and a successful application build. Partial progress is
not completion.
