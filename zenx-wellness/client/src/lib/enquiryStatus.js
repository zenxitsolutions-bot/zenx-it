// Single source of truth for enquiry status labels — shared by the pipeline board (columns +
// card dropdown) and the detail drawer's history timeline. "closed" is relabeled "Unsuccessful",
// and "converted" "Successfully Converted / Won", to match the business language in the spec; the
// underlying enum values are unchanged (see docs/specs/2026-round2-fixes.md item 1).
export const STATUS_LABEL = {
  new: 'New enquiry',
  contacted: 'Contacted',
  'follow-up': 'Follow-up',
  converted: 'Successfully Converted / Won',
  closed: 'Unsuccessful',
};

export const STATUSES = Object.keys(STATUS_LABEL);

/**
 * Status colors, identical to the ZenX admin CRM's pipeline so the same lead reads the same in
 * both products: new blue · contacted purple · follow-up orange · converted green · lost red.
 *
 * `chip` is a soft tint plus a darker shade of the same hue for the label — the pure status colors
 * are correct for dots and fills but unreadable as small text on white (the orange sits at 2.13:1),
 * so the text uses a darkened counterpart of its own hue. `dot` is the pure value.
 */
export const STATUS_CHIP = {
  new: 'bg-tint-blue text-status-new-ink',
  contacted: 'bg-tint-purple text-status-contacted-ink',
  'follow-up': 'bg-tint-orange text-status-followup-ink',
  converted: 'bg-tint-green text-status-converted-ink',
  closed: 'bg-tint-red text-status-lost-ink',
};

export const STATUS_DOT = {
  new: 'bg-status-new',
  contacted: 'bg-status-contacted',
  'follow-up': 'bg-status-followup',
  converted: 'bg-status-converted',
  closed: 'bg-status-lost',
};
