/**
 * Company slug rules (used for routing only — never an authorization check):
 * lowercase, spaces/symbols become hyphens, a trailing legal-entity suffix
 * (LLC, Inc, Corp, Ltd, ...) is dropped, no leading/trailing hyphens.
 * Uniqueness is enforced by generateUniqueCompanySlug in
 * services/provisioning.ts, which appends -2, -3, … on collision.
 *
 * "ABC Nutrition LLC" -> "abc-nutrition"
 * "Dallas Fitness Center" -> "dallas-fitness-center"
 * "John's Wellness & Nutrition" -> "johns-wellness-nutrition"
 */
const TRAILING_LEGAL_SUFFIX =
  /\s+(llc|inc\.?|incorporated|corp\.?|corporation|ltd\.?|limited|llp|pllc|co\.?)\.?$/i;

export function slugify(input: string): string {
  return input
    .trim()
    .replace(TRAILING_LEGAL_SUFFIX, "")
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
