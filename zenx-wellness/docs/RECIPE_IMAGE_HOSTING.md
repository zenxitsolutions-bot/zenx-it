# Optimized recipe-image hosting

The catalogue keeps one optimized WebP per original picture. There are no PNG
image copies or PNG-named files containing WebP bytes. Existing saved recipe and
meal-plan links can still contain `.png`, so hosting compatibility must ship with
the new frontend artifact.

`shared/recipeImageAssets.js` is the allowlist of converted basenames. The Vite
plugin in `client/build/recipeImageCompatibility.js` uses that same list in local
development and preview, and generates static hosting configuration at every
build. A production build fails if an allowlisted WebP file is missing.

## Local development and preview

Run `npm run dev` or `npm run preview` from `zenx-wellness/client` as usual.
An exact local catalogue PNG URL redirects to the matching WebP only when its
converted image exists. Uploads, external URLs and unrelated image directories
are untouched. Unknown or missing catalogue images return 404 rather than the
application's HTML. GET and HEAD are supported; writes to image URLs are rejected.

## Netlify

Deploy the complete freshly built `client/dist` directory and retain the updated
`client/netlify.toml`. Each build emits:

- `_redirects`: an exact PNG-to-WebP rule per converted image;
- `_recipe-image-not-found.txt`: the small body of a catalogue-only 404 response;
- `_recipe-catalog-nginx-map.conf`: an optional Nginx map for self-hosted deployments.

The generated `_redirects` rules are processed before the TOML rules. The first
TOML rule handles missing catalogue paths with 404; existing WebP files use normal
static-file serving. The final SPA rewrite remains available for application
routes. Do not add `force = true` to the catalogue 404 rule: that would hide valid
image files. This uses static redirects, not edge/serverless functions, and does
not duplicate the images.

Netlify's current [redirect documentation](https://docs.netlify.com/manage/routing/redirects/overview/)
documents the processing order and a serialized configuration-size limit. Review
the deploy log for redirect processing errors; this catalogue uses fewer than
1,000 exact rules, not thousands of wildcard substitutions. See also
[file shadowing](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/).

## AWS / Nginx static hosting (operator action required)

Nothing in AWS or the running Nginx configuration was changed by this work.
`vite preview` is only a local check, not a production server. If AWS serves the
frontend with Nginx, the equivalent rules must be installed before retiring the
old PNG files from the active frontend release.

The build emits an exact allowlist map rather than a generic `.png` extension
rewrite. Copy `_recipe-catalog-nginx-map.conf` from the new artifact to the
Nginx configuration directory as part of the deployment. Include it in the
`http` context, not inside a `server` or `location` block:

```nginx
# http context; adjust this operator-owned configuration path.
include /etc/nginx/recipe-catalog-nginx-map.conf;
```

Add the following location inside the existing wellness frontend `server`
block. Keep its existing `root`, TLS, API proxy and security settings. Do not
replace the complete configuration with this excerpt.

```nginx
location ^~ /images/recipe-catalog/ {
    # A return-only if does not perform a filesystem rewrite.
    if ($recipe_catalog_webp != "") {
        return 301 $recipe_catalog_webp$is_args$args;
    }
    # Never answer a missing image with the SPA's index.html.
    try_files $uri =404;
}
```

Ensure the installed MIME types include `image/webp` for `.webp`. Validate with
`nginx -t` before an operator reload. Deploy the matching frontend/map together
and retain a rollback artifact. Any CDN in front of Nginx must allow the legacy
redirect and return the correct content type for the new URL. Other static hosts
need equivalent manifest-based redirects and an image-only 404 rule.

After deployment, check a real catalogue filename from the manifest:

1. Its old `.png` URL returns 301 with the same basename ending in `.webp`.
2. Following the redirect returns 200, `Content-Type: image/webp` and the picture.
3. A fabricated catalogue filename returns 404, not `index.html`.
4. A direct app-route refresh still loads the app.

This changes frontend assets only. It does not migrate a database, delete uploaded
photos, purge previous server releases, shrink Git history, or reduce an existing
AWS disk allocation. Those are separate operator decisions.
