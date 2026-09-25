import path from 'node:path'
import { statSync } from 'node:fs'

export const CATALOG_PREFIX = '/images/recipe-catalog/'
const SAFE_BASENAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function checkedNames(basenames) {
  if (!Array.isArray(basenames) || basenames.length === 0) {
    throw new Error('Recipe image compatibility requires a non-empty conversion manifest')
  }
  if (basenames.some((name) => typeof name !== 'string' || !SAFE_BASENAME.test(name))) {
    throw new Error('Recipe image conversion manifest contains an unsafe basename')
  }
  if (new Set(basenames).size !== basenames.length) {
    throw new Error('Recipe image conversion manifest contains duplicate basenames')
  }
  return [...basenames].sort()
}

/** Exact local paths only: never rewrite uploads, remote URLs or guessed filenames. */
export function catalogRequest(rawUrl, basenames) {
  if (typeof rawUrl !== 'string') return null
  const queryIndex = rawUrl.indexOf('?')
  const pathname = queryIndex < 0 ? rawUrl : rawUrl.slice(0, queryIndex)
  if (!pathname.startsWith(CATALOG_PREFIX)) return null
  if ([...rawUrl].some((character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)
    || rawUrl.includes('\\') || rawUrl.includes('#')) return { status: 'missing' }
  const match = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.(png|webp)$/.exec(pathname.slice(CATALOG_PREFIX.length))
  const names = basenames instanceof Set ? basenames : new Set(basenames)
  if (!match || !names.has(match[1])) return { status: 'missing' }
  return {
    status: match[2] === 'png' ? 'redirect' : 'asset',
    basename: match[1],
    target: `${CATALOG_PREFIX}${match[1]}.webp`,
    query: queryIndex < 0 ? '' : rawUrl.slice(queryIndex),
  }
}

function isFile(filename) {
  try {
    return statSync(filename).isFile()
  } catch {
    return false
  }
}

export function createCatalogMiddleware({ basenames, assetRoot, fileExists = isFile }) {
  const names = new Set(checkedNames(basenames))
  return (req, res, next) => {
    const result = catalogRequest(req.url, names)
    if (!result) return next()
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405
      res.setHeader('Allow', 'GET, HEAD')
      res.end()
      return
    }
    if (result.status === 'missing' || !fileExists(path.join(assetRoot, `${result.basename}.webp`))) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.end(req.method === 'HEAD' ? undefined : 'Recipe image not found')
      return
    }
    if (result.status === 'asset') return next()
    res.statusCode = 301
    res.setHeader('Location', `${result.target}${result.query}`)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.end()
  }
}

export function netlifyCatalogRedirects(basenames) {
  return [
    '# Generated from the recipe image conversion manifest. Do not edit in dist.',
    ...checkedNames(basenames).map((name) => `${CATALOG_PREFIX}${name}.png ${CATALOG_PREFIX}${name}.webp 301`),
    '',
  ].join('\n')
}

export function nginxCatalogMap(basenames) {
  return [
    '# Generated from the recipe image conversion manifest. Include in the http context.',
    'map $uri $recipe_catalog_webp {',
    '    default "";',
    ...checkedNames(basenames).map((name) => `    "${CATALOG_PREFIX}${name}.png" "${CATALOG_PREFIX}${name}.webp";`),
    '}',
    '',
  ].join('\n')
}

/** Same compatibility behavior in Vite development, preview and static build artifacts. */
export function recipeImageCompatibility({ basenames }) {
  const names = checkedNames(basenames)
  let resolvedConfig
  return {
    name: 'recipe-image-compatibility',
    configResolved(config) {
      resolvedConfig = config
    },
    configureServer(server) {
      server.middlewares.use(createCatalogMiddleware({
        basenames: names,
        assetRoot: path.join(server.config.publicDir, CATALOG_PREFIX),
      }))
    },
    configurePreviewServer(server) {
      server.middlewares.use(createCatalogMiddleware({
        basenames: names,
        assetRoot: path.resolve(server.config.root, server.config.build.outDir, `.${CATALOG_PREFIX}`),
      }))
    },
    generateBundle() {
      for (const name of names) {
        if (!isFile(path.join(resolvedConfig.publicDir, CATALOG_PREFIX, `${name}.webp`))) {
          this.error(`Missing optimized recipe image: ${name}.webp. Run the catalogue optimization before building.`)
        }
      }
      this.emitFile({ type: 'asset', fileName: '_redirects', source: netlifyCatalogRedirects(names) })
      this.emitFile({ type: 'asset', fileName: '_recipe-catalog-nginx-map.conf', source: nginxCatalogMap(names) })
      this.emitFile({ type: 'asset', fileName: '_recipe-image-not-found.txt', source: 'Recipe image not found\n' })
    },
  }
}
