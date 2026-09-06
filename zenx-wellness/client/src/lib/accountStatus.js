// Deliberately duplicated from the server's inline enum (server/src/schemas/user.schema.js) —
// same "no shared package between client/ and server/" convention as PLAN_DURATIONS.
export const ACCOUNT_STATUSES = ['active', 'inactive', 'suspended'];

export const ACCOUNT_STATUS_LABEL = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
};

// Badge variant per status — matches the Badge component's existing variant palette used
// elsewhere for call/report status chips.
export const ACCOUNT_STATUS_BADGE_VARIANT = {
  active: 'secondary',
  inactive: 'outline',
  suspended: 'destructive',
};
