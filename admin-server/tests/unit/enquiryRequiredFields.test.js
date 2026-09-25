import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEnquirySchema } from '../../src/schemas/enquiry.schema.js';

const validContact = {
  contactName: 'Test Visitor',
  phone: '+14155552671',
  email: 'visitor@example.com',
};
const optionalFields = [
  'companyName', 'website', 'service', 'source', 'addressLine1', 'addressLine2',
  'city', 'state', 'zip', 'country', 'notes',
];

test('name, valid phone and email alone are sufficient for a new enquiry', () => {
  const result = createEnquirySchema.parse(validContact);
  for (const field of optionalFields) assert.equal(result[field], null, field);
  for (const [field, value] of Object.entries(validContact)) assert.equal(result[field], value);
});

test('each mandatory field rejects missing, empty, whitespace-only and null values', () => {
  for (const field of ['contactName', 'phone', 'email']) {
    for (const value of [undefined, '', '   ', null]) {
      const result = createEnquirySchema.safeParse({ ...validContact, [field]: value });
      assert.equal(result.success, false, `${field}: ${JSON.stringify(value)}`);
      assert.ok(result.error.issues.some((issue) => issue.path[0] === field));
    }
  }
});

test('invalid phone numbers and email addresses still fail validation', () => {
  for (const phone of ['123', '+10000000000', 'not a phone']) {
    assert.equal(createEnquirySchema.safeParse({ ...validContact, phone }).success, false);
  }
  for (const email of ['visitor', 'visitor@', '@example.com']) {
    assert.equal(createEnquirySchema.safeParse({ ...validContact, email }).success, false);
  }
});

test('contact inputs are trimmed before required-field validation', () => {
  const result = createEnquirySchema.parse({
    contactName: '  Test Visitor  ', phone: '  +14155552671  ', email: '  visitor@example.com  ',
  });
  for (const [field, value] of Object.entries(validContact)) assert.equal(result[field], value);
});

test('every optional field accepts omitted, empty, whitespace-only or null values as null', () => {
  for (const value of [undefined, '', ' \t ', null]) {
    const values = Object.fromEntries(optionalFields.map((field) => [field, value]));
    const result = createEnquirySchema.parse({ ...validContact, ...values });
    for (const field of optionalFields) assert.equal(result[field], null, field);
  }
});

test('provided optional details are trimmed and preserved without selecting defaults', () => {
  const details = {
    companyName: 'Example Co', website: 'https://example.com', service: 'Website', source: 'Referral',
    addressLine1: '1 Example Lane', addressLine2: 'Suite 2', city: 'Chicago', state: 'IL',
    zip: '60601', country: 'United States', notes: 'Please call next week.',
  };
  const padded = Object.fromEntries(Object.entries(details).map(([field, value]) => [field, `  ${value}  `]));
  const result = createEnquirySchema.parse({ ...validContact, ...padded });
  for (const [field, value] of Object.entries(details)) assert.equal(result[field], value);
});

test('unrecognized nonempty service/source values remain invalid', () => {
  for (const field of ['service', 'source']) {
    assert.equal(createEnquirySchema.safeParse({ ...validContact, [field]: 'unrecognized' }).success, false);
  }
});

test('staff-provided required phone values remain compatible with the public create schema', () => {
  for (const phone of ['+14155552671', '+919876543210']) {
    assert.equal(createEnquirySchema.safeParse({
      ...validContact, phone, companyName: 'Staff-entered business', service: 'Website', source: 'Direct',
    }).success, true);
  }
});

test('enquiry insertion writes SQL null for missing optional fields without inventing enum choices', async (t) => {
  // Importing the pool is lazy (no connection); its only query method is mocked before the model
  // runs. This test never writes to a database, creates a notification, or sends an email.
  const { pool } = await import('../../src/db/pool.js');
  const { createEnquiry } = await import('../../src/models/Enquiry.js');
  const calls = [];
  t.mock.method(pool, 'query', async (sql, params) => {
    calls.push({ sql, params });
    return sql.startsWith('INSERT') ? [{ affectedRows: 1 }] : [[{ id: params[0], contact_name: validContact.contactName }]];
  });
  await createEnquiry(validContact);
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /^INSERT INTO enquiries/);
  const values = calls[0].params;
  assert.equal(values.length, 17);
  for (const position of [1, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16]) {
    assert.equal(values[position], null, `SQL parameter ${position}`);
  }
  assert.equal(values[2], validContact.contactName);
  assert.equal(values[3], validContact.phone);
  assert.equal(values[4], validContact.email);
  assert.equal(values[8], 'NEW');
  assert.equal(values[9], 'MEDIUM');
});

test('enquiry insertion also normalizes blank optional strings for internal callers', async (t) => {
  const { pool } = await import('../../src/db/pool.js');
  const { createEnquiry } = await import('../../src/models/Enquiry.js');
  let inserted;
  t.mock.method(pool, 'query', async (sql, params) => {
    if (sql.startsWith('INSERT')) inserted = params;
    return sql.startsWith('INSERT') ? [{ affectedRows: 1 }] : [[{ id: params[0] }]];
  });
  await createEnquiry({ ...validContact, ...Object.fromEntries(optionalFields.map((field) => [field, '  '])) });
  for (const position of [1, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16]) {
    assert.equal(inserted[position], null, `SQL parameter ${position}`);
  }
});
