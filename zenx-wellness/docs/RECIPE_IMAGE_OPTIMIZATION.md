# Recipe photo storage optimization

Every catalog photo retains its original content, composition and full pixel
dimensions. The 878 recipe mappings remain one-to-one; 13 earlier draft assets
are also retained rather than deleted as unused artwork. No client uploads,
profile pictures, reports, database records or unrelated files are changed.

## Measured result (2026-09-24)

All 891 assets retain 1254 x 1254 pixels. Total catalog storage changes from
2,085,741,636 bytes (1,989.12 MiB) to 372,293,036 bytes (355.05 MiB): **82.15%
smaller**, saving about 1.71 GB per deployed copy. All 878 active recipes retain
unique images. Quality selection: 789 photos at quality 94, 99 at quality 98,
and 3 at near-lossless 80. The lowest measured RGB PSNR is 41.0037 dB.

Visual review includes the lowest-scoring fish/quinoa image as well as the
representative dishes below. Food detail and color remain clear; subtle
background-texture smoothing can be visible on close comparison.

Original recovery commit: `335c02f854e40ce43e16308540fa99b3bf5d0037`.
The original path for any manifest basename is
`zenx-wellness/client/public/images/recipe-catalog/<basename>.png` in that commit.
Recover individual originals to a separate review directory, not the deployed
public folder, to avoid reintroducing duplicate storage.

## Quality policy

- Encode the original PNG using Sharp/WebP quality 94, high-quality chroma
  subsampling and effort 6, without resizing, cropping or regenerating artwork.
- Decode both files and measure RGB PSNR. Require at least 41 dB for every image;
  retry quality 98, then near-lossless quality 80 if necessary.
- Verify complete decoding, dimensions, color profile handling, exact alpha
  preservation when present, unique file hashes and a smaller output file.
- Visually compare representative smoothie, leafy curry, vegetable salad and
  rice dishes at full resolution. Automated metrics complement this review;
  they are not a claim that lossy compression is pixel-identical.

The encoder is a development-only dependency at the monorepo root. Neither API
nor browser re-encodes these assets during normal requests. The optional script
uses three bounded workers, so deployment does not need an image generation
service or a conversion job at application startup.

## Verification and reproducibility

From the monorepo root, run `npm ci`, then:

```sh
npm run images:check
```

This checks complete recipe coverage, unique image bytes, full-resolution WebP
decoding, matching frontend/backend registries, all compatibility targets and
absence of redundant deployed PNG originals. Unit tests additionally cover
legacy database URLs, copied recipes, customized meal titles and hosting rules.

The one-time migration is intentionally split into two explicit steps, executed
only when the allowlisted original PNGs are available in a working copy:

```sh
npm run images:optimize -- --apply
# Review .local/image-optimization/report.json and the actual photos first.
npm run images:optimize -- --remove-originals
```

`--apply` retains all originals and records source/output hashes and per-image
quality in the local report. Existing outputs must be identical to the current
deterministic encoding or match a previous recorded output; hand-edited images
are never silently replaced. `--remove-originals` rechecks all 891 pairs, then
requires every original to exactly match a committed Git blob before unlinking
only those exact PNG paths. There is no recursive deletion. Originals remain
recoverable from the Git commit recorded in the report; Git history is not
rewritten. Do not run the migration again on already-compressed WebP sources.

## Deployment and real server savings

Build the wellness client after conversion. Vite regenerates `dist` without the
large PNG copies. Deploy the complete new artifact together with its legacy-link
compatibility rules; see [hosting instructions](RECIPE_IMAGE_HOSTING.md).

For AWS/Nginx, an operator must install the generated exact redirect map and
validate the configuration. Neither Git push nor AWS deployment is performed by
the optimizer. Replacing files in an old release by copying new files over it
may leave stale PNGs: prefer a new release directory and your existing verified
release/rollback procedure. Old releases, backups and the roughly 2 GB of Git
history are separate storage; do not blindly delete them to claim these savings.

Encoder options: [Sharp WebP documentation](https://sharp.pixelplumbing.com/api-output/#webp).
