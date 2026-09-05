// Fixed, non-admin-managed duration choices for a client's Plan (see program_plans in
// schema.sql) — unlike the Plan itself, these aren't a CRUD entity, just a shared enum, so this
// constant is deliberately duplicated on the client (client/src/lib/planDurations.js) the same
// way CALL_DURATION_MINUTES already is.
export const PLAN_DURATIONS = ['1 month', '3 months', '6 months', '12 months'];
