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
