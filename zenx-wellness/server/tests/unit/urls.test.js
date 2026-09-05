import test from 'node:test';
import assert from 'node:assert/strict';
import { companyLoginUrl, portalPathUrl } from '../../src/utils/urls.js';

test('companyLoginUrl prefers the company slug', () => {
  assert.match(companyLoginUrl({ companySlug: 'acme' }), /\/acme\/login$/);
  assert.match(companyLoginUrl('acme'), /\/acme\/login$/);
  assert.match(companyLoginUrl({}), /\/login$/);
});

test('portalPathUrl prefixes the slug and keeps the path', () => {
  assert.match(portalPathUrl({ companySlug: 'acme' }, '/app/calls'), /\/acme\/app\/calls$/);
  assert.match(portalPathUrl({}, '/app/calls'), /\/app\/calls$/);
});
