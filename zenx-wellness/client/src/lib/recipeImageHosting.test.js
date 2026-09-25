import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import {
  catalogRequest, createCatalogMiddleware, netlifyCatalogRedirects,
  nginxCatalogMap, recipeImageCompatibility,
} from '../../build/recipeImageCompatibility.js'

const basenames = ['0002-mango-yogurt-smoothie', '0001-banana-oats-smoothie']
const prefix = '/images/recipe-catalog/'
const png = `${prefix}${basenames[0]}.png`
const webp = `${prefix}${basenames[0]}.webp`

function runMiddleware(url, { method = 'GET', exists = true } = {}) {
  const result = { statusCode: 200, headers: {}, body: null, next: false, checked: [] }
  const res = {
    set statusCode(value) { result.statusCode = value },
    setHeader(name, value) { result.headers[name.toLowerCase()] = value },
    end(body) { result.body = body },
  }
  const middleware = createCatalogMiddleware({
    basenames, assetRoot: path.resolve('fixture', 'recipe-catalog'),
    fileExists(filename) { result.checked.push(filename); return exists },
  })
  middleware({ url, method }, res, () => { result.next = true })
  return result
}

test('legacy catalogue images redirect only exact manifest names and preserve query strings', () => {
  const result = runMiddleware(`${png}?v=2&size=large`)
  assert.equal(result.statusCode, 301)
  assert.equal(result.headers.location, `${webp}?v=2&size=large`)
  assert.equal(result.next, false)
  assert.equal(result.checked[0], path.resolve('fixture', 'recipe-catalog', `${basenames[0]}.webp`))
  assert.equal(runMiddleware(png, { method: 'HEAD' }).statusCode, 301)
})

test('existing WebP images use the normal static server without loops or copied bytes', () => {
  const result = runMiddleware(webp)
  assert.equal(result.next, true)
  assert.equal(result.headers.location, undefined)
})

test('unknown catalogue assets and missing conversion targets return 404 rather than SPA HTML', () => {
  for (const url of [`${prefix}unknown.png`, `${prefix}unknown.webp`, `${prefix}foo/bar.png`, prefix]) {
    const result = runMiddleware(url)
    assert.equal(result.statusCode, 404, url)
    assert.equal(result.next, false)
    assert.equal(result.headers.location, undefined)
  }
  assert.equal(runMiddleware(png, { exists: false }).statusCode, 404)
  assert.equal(runMiddleware(webp, { exists: false }).statusCode, 404)
  assert.equal(runMiddleware(webp, { exists: false, method: 'HEAD' }).body, undefined)
})

test('external, uploads, malformed and traversal paths never redirect or touch the filesystem', () => {
  for (const url of [
    `https://example.test${png}`, `//example.test${png}`, '/uploads/user-photo.png',
    `${prefix}../secret.png`, `${prefix}%2e%2e/secret.png`, `${prefix}%30${basenames[0]}.png`,
    `${prefix}a\\b.png`, `${png}\r\nLocation: https://example.test`, `${png}#fragment`,
  ]) {
    const result = runMiddleware(url)
    assert.equal(result.headers.location, undefined, url)
    assert.equal(result.checked.length, 0, url)
  }
})

test('image compatibility accepts GET/HEAD only and does not redirect writes', () => {
  const result = runMiddleware(png, { method: 'POST' })
  assert.equal(result.statusCode, 405)
  assert.equal(result.headers.allow, 'GET, HEAD')
  assert.equal(result.checked.length, 0)
})

test('static configs contain sorted exact manifest mappings, not broad extension replacements', () => {
  const redirects = netlifyCatalogRedirects(basenames)
  assert.equal(redirects.split('\n').filter((line) => line.startsWith('/')).length, 2)
  assert.ok(redirects.indexOf(basenames[1]) < redirects.indexOf(basenames[0]))
  assert.ok(redirects.includes(`${png} ${webp} 301`))
  assert.equal(redirects.includes('*'), false)
  const nginx = nginxCatalogMap(basenames)
  assert.ok(nginx.includes('map $uri $recipe_catalog_webp {'))
  assert.ok(nginx.includes(`"${png}" "${webp}";`))
  assert.ok(nginx.includes('default "";'))
})

test('unsafe, duplicate or empty manifests fail the build plugin and static-config generation', () => {
  for (const invalid of [[], null, ['../escape'], ['https://example.test'], ['a', 'a'], ['A'], ['a.webp']]) {
    assert.throws(() => recipeImageCompatibility({ basenames: invalid }))
    assert.throws(() => netlifyCatalogRedirects(invalid))
    assert.throws(() => nginxCatalogMap(invalid))
  }
  assert.equal(catalogRequest(png, new Set(basenames)).target, webp)
})

test('Vite installs catalogue middleware before both dev and preview static serving', () => {
  const plugin = recipeImageCompatibility({ basenames })
  const middleware = []
  const server = {
    config: { root: path.resolve('fixture'), publicDir: path.resolve('fixture', 'public'), build: { outDir: 'dist' } },
    middlewares: { use(handler) { middleware.push(handler) } },
  }
  assert.equal(plugin.configureServer(server), undefined)
  assert.equal(plugin.configurePreviewServer(server), undefined)
  assert.equal(middleware.length, 2)
  assert.ok(middleware.every((handler) => typeof handler === 'function'))
})

test('every build emits fresh static compatibility text and fails when a target is missing', (t) => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'zenx-recipe-hosting-'))
  t.after(() => rmSync(fixture, { recursive: true, force: true }))
  const catalogue = path.join(fixture, 'images', 'recipe-catalog')
  mkdirSync(catalogue, { recursive: true })
  const plugin = recipeImageCompatibility({ basenames })
  plugin.configResolved({ publicDir: fixture })
  const output = []
  const context = { error(message) { throw new Error(message) }, emitFile(asset) { output.push(asset) } }
  assert.throws(() => plugin.generateBundle.call(context), /Missing optimized recipe image/)
  assert.equal(output.length, 0)
  for (const name of basenames) writeFileSync(path.join(catalogue, `${name}.webp`), 'synthetic fixture')
  plugin.generateBundle.call(context)
  assert.deepEqual(output.map((asset) => asset.fileName), [
    '_redirects', '_recipe-catalog-nginx-map.conf', '_recipe-image-not-found.txt',
  ])
  assert.equal(output[0].source, netlifyCatalogRedirects(basenames))
  assert.equal(output[1].source, nginxCatalogMap(basenames))
  assert.ok(output.every((asset) => asset.type === 'asset' && typeof asset.source === 'string'))
})

test('Netlify image404 precedes SPA fallback and leaves valid static files unforced', () => {
  const config = readFileSync(fileURLToPath(new URL('../../netlify.toml', import.meta.url)), 'utf8')
  const imageRule = config.indexOf('from = "/images/recipe-catalog/*"')
  const spaRule = config.indexOf('from = "/*"')
  assert.ok(imageRule >= 0 && imageRule < spaRule)
  assert.match(config.slice(imageRule, spaRule), /status = 404/)
  assert.doesNotMatch(config, /force\s*=\s*true/)
})
