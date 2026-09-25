import test from "node:test";
import assert from "node:assert/strict";
import { enquiryPayload, validateEnquiry } from "./enquiryForm.js";

const required = { name: "Sample Contact", phone: "+14155552671", email: "sample@example.com" };

test("name, phone, and email alone are sufficient", () => {
  assert.deepEqual(validateEnquiry(required), {});
  assert.deepEqual(validateEnquiry({ ...required, companyName: "", website: "", lookingFor: "", source: "", message: "" }), {});
});

test("empty form reports exactly the three required fields", () => {
  assert.deepEqual(Object.keys(validateEnquiry({})).sort(), ["email", "name", "phone"]);
});

for (const field of ["name", "phone", "email"]) {
  test(`${field} cannot be omitted or whitespace`, () => {
    for (const value of [undefined, "", "   "]) {
      assert.deepEqual(Object.keys(validateEnquiry({ ...required, [field]: value })), [field]);
    }
  });
}

test("invalid email and phone are still rejected", () => {
  assert.ok(validateEnquiry({ ...required, email: "invalid-email" }).email);
  assert.ok(validateEnquiry({ ...required, phone: "+123" }).phone);
});

test("surrounding whitespace is accepted and trimmed before submission", () => {
  const form = { name: " Sample Contact ", email: " sample@example.com ", phone: " +14155552671 " };
  assert.deepEqual(validateEnquiry(form), {});
  assert.deepEqual(enquiryPayload(form), {
    contactName: "Sample Contact", email: "sample@example.com", phone: "+14155552671",
    companyName: null, website: null, service: null, source: null, notes: null,
  });
});

test("optional answers are preserved when provided, without invented defaults", () => {
  assert.deepEqual(enquiryPayload({ ...required, companyName: " Example ", website: " example.com ", lookingFor: "Website", source: "Referral", message: " Details " }), {
    contactName: required.name, phone: required.phone, email: required.email,
    companyName: "Example", website: "example.com", service: "Website", source: "Referral", notes: "Details",
  });
  assert.equal(enquiryPayload({ ...required, companyName: "  ", lookingFor: "", source: "" }).service, null);
});
