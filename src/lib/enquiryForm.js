import { isValidPhoneNumber } from "react-phone-number-input";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (value) => typeof value === "string" ? value.trim() : "";
const optionalText = (value) => text(value) || null;

export function validateEnquiry(form) {
  const errors = {};
  if (!text(form.name)) errors.name = "Please enter your name.";
  if (!text(form.email)) errors.email = "Please enter your email.";
  else if (!EMAIL_RE.test(text(form.email))) errors.email = "Enter a valid email address.";
  if (!text(form.phone)) errors.phone = "Please enter your phone number.";
  else if (!isValidPhoneNumber(text(form.phone))) errors.phone = "Enter a valid phone number.";
  return errors;
}

export function enquiryPayload(form) {
  return {
    contactName: text(form.name),
    phone: text(form.phone),
    email: text(form.email),
    companyName: optionalText(form.companyName),
    website: optionalText(form.website),
    service: optionalText(form.lookingFor),
    source: optionalText(form.source),
    notes: optionalText(form.message),
  };
}
