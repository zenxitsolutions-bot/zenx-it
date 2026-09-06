import { parsePhoneNumberFromString } from "libphonenumber-js";

// react-phone-number-input's controlled `value` must be E.164 or empty — an enquiry logged before
// this field existed may hold a bare local number that isn't. Rather than pass that straight
// through (the library warns and can't detect a country for it), treat an unparseable legacy
// value as unset so the field starts blank instead of console-warning on every render; a real
// E.164 value, or one parseable under the guessed default country, passes through unchanged.
export function toE164OrEmpty(value: string | null | undefined, defaultCountry: "US" = "US"): string {
  if (!value) return "";
  const parsed = parsePhoneNumberFromString(value, defaultCountry);
  return parsed?.isValid() ? parsed.number : "";
}
