import test from 'node:test';
import assert from 'node:assert/strict';
import { unsafeOriginGuard } from '../../src/middleware/unsafeOriginGuard.js';

const guard = unsafeOriginGuard(['https://portal.example.test', 'https://marketing.example.test']);
function check(method, headers = {}) {
  let called = false;
  let error;
  guard({ method, headers }, {}, (value) => { called = true; error = value; });
  assert.equal(called, true);
  return error;
}

test('unsafe requests from explicitly allowed browser origins reach the route', () => {
  for (const origin of ['https://portal.example.test', 'https://marketing.example.test']) {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      assert.equal(check(method, { origin, 'sec-fetch-site': 'cross-site' }), undefined);
    }
  }
});

test('untrusted origins cannot submit cookie-authenticated simple POST or other unsafe methods', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const error = check(method, { origin: 'https://attacker.example.test', 'content-type': 'application/x-www-form-urlencoded' });
    assert.equal(error.status, 403);
    assert.equal(error.message, 'Request origin is not allowed');
    assert.doesNotMatch(error.message, /attacker/);
  }
  assert.equal(check('POST', { origin: 'https://portal.example.test.attacker.test', 'sec-fetch-site': 'same-site' }).status, 403);
});

test('opaque null origins, malformed origins and empty origins are rejected', () => {
  for (const origin of ['null', '', ['https://portal.example.test'], 'https://portal.example.test/']) {
    assert.equal(check('POST', { origin }).status, 403);
  }
});

test('server-to-server requests without Origin remain supported', () => {
  assert.equal(check('POST'), undefined);
  assert.equal(check('PUT', { 'sec-fetch-site': 'same-origin' }), undefined);
  assert.equal(check('PATCH', { 'sec-fetch-site': 'same-site' }), undefined);
});

test('browser cross-site unsafe requests missing Origin are rejected', () => {
  assert.equal(check('POST', { 'sec-fetch-site': 'cross-site' }).status, 403);
  assert.equal(check('DELETE', { 'sec-fetch-site': 'cross-site' }).status, 403);
});

test('GET OAuth callbacks, HEAD and OPTIONS preflight remain unaffected', () => {
  for (const method of ['GET', 'HEAD', 'OPTIONS']) {
    assert.equal(check(method, { origin: 'https://attacker.example.test', 'sec-fetch-site': 'cross-site' }), undefined);
    assert.equal(check(method, { 'sec-fetch-site': 'cross-site' }), undefined);
  }
});
