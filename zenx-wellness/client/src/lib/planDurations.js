// Fixed, non-admin-managed duration choices for a client's Plan — deliberately duplicated from
// server/src/constants/planDurations.js (same pattern as CALL_DURATION_MINUTES), since this
// monorepo has no package shared between client/ and server/.
export const PLAN_DURATIONS = ['1 month', '3 months', '6 months', '12 months'];
