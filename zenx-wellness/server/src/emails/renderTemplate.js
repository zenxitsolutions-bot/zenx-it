import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml } from './escapeHtml.js';

const templatesDir = join(dirname(fileURLToPath(import.meta.url)), 'templates');
const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

// Loaded once per process — templates are static files, not user content, so there's no reason to
// re-read disk on every send.
const cache = new Map();

function loadTemplateFiles(templateKey) {
  if (cache.has(templateKey)) return cache.get(templateKey);

  const dir = join(templatesDir, templateKey);
  if (!existsSync(dir)) {
    throw new Error(`Unknown email template: "${templateKey}" (no directory at ${dir})`);
  }
  const files = {
    subject: readFileSync(join(dir, 'subject.txt'), 'utf8').trim(),
    html: readFileSync(join(dir, 'body.html'), 'utf8'),
    text: readFileSync(join(dir, 'body.text.txt'), 'utf8'),
  };
  cache.set(templateKey, files);
  return files;
}

function tokensIn(...sources) {
  const tokens = new Set();
  for (const source of sources) {
    for (const match of source.matchAll(TOKEN_RE)) tokens.add(match[1]);
  }
  return tokens;
}

function interpolate(source, params, transform) {
  return source.replace(TOKEN_RE, (whole, key) => transform(params[key]));
}

// Renders all three parts of a template against `params`. Every placeholder found in any of the
// three files must have a matching key in `params` — a missing one throws immediately rather than
// silently shipping an email with a literal "{{client_name}}" in it.
export function renderTemplate(templateKey, params = {}) {
  const { subject, html, text } = loadTemplateFiles(templateKey);

  const required = tokensIn(subject, html, text);
  const missing = [...required].filter((key) => params[key] === undefined || params[key] === null);
  if (missing.length > 0) {
    throw new Error(`Missing param(s) for email template "${templateKey}": ${missing.join(', ')}`);
  }

  return {
    subject: interpolate(subject, params, (v) => String(v)),
    html: interpolate(html, params, (v) => escapeHtml(v)),
    text: interpolate(text, params, (v) => String(v)),
  };
}
