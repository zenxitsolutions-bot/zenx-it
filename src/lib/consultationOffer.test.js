import test from "node:test";
import assert from "node:assert/strict";
import { FREE_CONSULTATION_HREF, getEnquiryContext } from "./consultationOffer.js";

test("free consultation link opens enquiry with the recognized offer", () => {
  const url = new URL(FREE_CONSULTATION_HREF, "https://example.com");
  assert.equal(url.pathname, "/enquiry");
  assert.deepEqual(getEnquiryContext(url.search), {
    service: "",
    isFreeConsultation: true,
  });
});

test("ordinary enquiries retain the generic experience", () => {
  assert.deepEqual(getEnquiryContext(), { service: "", isFreeConsultation: false });
  assert.deepEqual(getEnquiryContext("?offer="), { service: "", isFreeConsultation: false });
});

test("unknown offers do not become a free consultation", () => {
  for (const offer of ["free-website", "free-audit", "free-demo", "FREE-CONSULTATION"]) {
    assert.equal(getEnquiryContext(`?offer=${offer}`).isFreeConsultation, false);
  }
});

test("existing service links retain their selected service", () => {
  assert.deepEqual(getEnquiryContext("?service=Digital%20Marketing"), {
    service: "Digital Marketing",
    isFreeConsultation: false,
  });
  assert.deepEqual(getEnquiryContext("?service=Software&offer=free-consultation"), {
    service: "Software",
    isFreeConsultation: true,
  });
  assert.deepEqual(getEnquiryContext("?offer=unknown&service=Website"), {
    service: "Website",
    isFreeConsultation: false,
  });
});
