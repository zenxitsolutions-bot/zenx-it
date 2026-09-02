export const ENQUIRY_STATUSES = [
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "CONVERTED",
  "LOST",
] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const STATUS_LABELS: Record<EnquiryStatus, string> = {
  NEW: "New Enquiry",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow-up",
  CONVERTED: "Converted",
  LOST: "Lost",
};

export const LEAD_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "HOT"] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const LEAD_SOURCES = [
  "Website",
  "Google",
  "Facebook",
  "Instagram",
  "Referral",
  "Direct",
  "Other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const SERVICE_OPTIONS = [
  "Website",
  "Digital Marketing",
  "Business Software",
  "Small Business POS",
  "ZenX Dietitian application",
  "Something else",
] as const;
export type ServiceOption = (typeof SERVICE_OPTIONS)[number];

export const CONTACT_TYPES = [
  "Phone Call",
  "Email",
  "WhatsApp",
  "Meeting",
  "Video Call",
  "Other",
] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const INTERACTION_OUTCOMES = [
  "Interested",
  "Needs More Information",
  "Not Interested",
  "Call Again",
  "Proposal Requested",
  "Ready to Convert",
  "Other",
] as const;
export type InteractionOutcome = (typeof INTERACTION_OUTCOMES)[number];

export const FOLLOWUP_REMINDERS = [
  "None",
  "15 minutes before",
  "30 minutes before",
  "1 hour before",
  "1 day before",
] as const;
export type FollowupReminder = (typeof FOLLOWUP_REMINDERS)[number];

export const FOLLOWUP_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "OVERDUE",
  "RESCHEDULED",
  "CANCELLED",
] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

export const ADMIN_ROLES = ["Super Admin", "Admin", "Sales", "Support"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export const APPLICATION_SLUGS = ["zenx-dietitian", "zenx-pos"] as const;
export type ApplicationSlug = (typeof APPLICATION_SLUGS)[number];

export const APPLICATION_ACCESS_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type ApplicationAccessStatus = (typeof APPLICATION_ACCESS_STATUSES)[number];

export const COMPANY_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export const SUBSCRIPTION_PLANS = ["starter", "growth", "enterprise"] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const SUBSCRIPTION_PLAN_LABELS: Record<SubscriptionPlan, string> = {
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
};

/**
 * Roles are application-specific, not a single fixed enum — a person's role in
 * one application says nothing about their role (or even access) in another.
 * These cover today's two applications; a future third application adds its
 * own list here rather than widening a shared enum.
 */
export const WELLNESS_ROLES = ["wellness_admin", "dietitian", "client"] as const;
export type WellnessRole = (typeof WELLNESS_ROLES)[number];

export const POS_ROLES = ["pos_admin", "pos_staff"] as const;
export type PosRole = (typeof POS_ROLES)[number];

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  // Optional: real API rows always have these (DB defaults), but demo-mode fixtures predate the
  // timezone rollout and don't set them — every consumer falls back to a sensible default anyway
  // (see timezoneService.effectiveTimezone's mirror on the server, or lib/timezone.ts on the client).
  timezone?: string;
  country?: string | null;
  date_format?: string;
  time_format?: "12h" | "24h";
  created_at: string;
}

export interface Enquiry {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  website: string | null;
  service: ServiceOption;
  source: LeadSource;
  status: EnquiryStatus;
  priority: LeadPriority;
  assigned_to: string | null;
  estimated_value: number | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  converted_at: string | null;
  lost_at: string | null;
}

export interface Interaction {
  id: string;
  enquiry_id: string;
  admin_id: string;
  contact_type: ContactType;
  comment: string;
  outcome: InteractionOutcome;
  next_action: string | null;
  created_at: string;
}

export interface Followup {
  id: string;
  enquiry_id: string;
  assigned_to: string | null;
  // The original wall-clock the creator typed — kept for display/audit, never combined
  // client-side anymore. scheduled_at_utc is the real, timezone-aware source of truth. Optional:
  // demo-mode fixtures predate the timezone rollout — see Profile's own comment on this pattern.
  scheduled_date: string;
  scheduled_time: string;
  scheduled_at_utc?: string;
  timezone?: string;
  contact_method: ContactType;
  notes: string | null;
  reminder: FollowupReminder;
  status: FollowupStatus;
  completed_at: string | null;
  created_at: string;
}

/**
 * A customer business. `id` (company_id) is the permanent tenant identifier —
 * every Wellness/POS record for this company is scoped by it. `company_slug`
 * is routing/display only and must never be trusted as an authorization
 * check on its own (see application_access below).
 */
export interface Company {
  id: string;
  enquiry_id: string | null;
  company_name: string;
  company_slug: string;
  company_email: string | null;
  company_phone: string | null;
  website: string | null;
  logo_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  // Optional: demo-mode fixtures predate the timezone rollout — see Profile's own comment.
  timezone?: string | null;
  status: CompanyStatus;
  subscription_plan?: SubscriptionPlan | null;
  created_at: string;
  updated_at: string;
}

/**
 * The permanent zenx_user_id identity, shared across every ZenX-sold
 * application. Distinct from `Profile` (ZenX's own internal staff) — a
 * customer's people are never `Profile` rows. Email is a contact/login
 * attribute only; a person's permanent relationship to a company is an
 * `ApplicationAccess` row, never their email address.
 */
export interface ZenxUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  job_title: string | null;
  status: AdminStatus;
  /**
   * True whenever an admin (at creation or via Reset Password) set this
   * person's password directly — they're required to change it on their
   * next successful login. The password itself is never stored on this row
   * or anywhere else the app can read back later: Supabase Auth holds it,
   * hashed, and only the moment-of-creation/reset screen ever displays it.
   */
  must_change_password: boolean;
  timezone?: string;
  country?: string | null;
  date_format?: string;
  time_format?: "12h" | "24h";
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

/**
 * `url`/`handoff_secret` are per-APPLICATION, not per-grant: each application is one shared
 * deployment serving every company (companies are distinguished by company_id inside that
 * deployment). `handoff_secret` is service-role/admin-only — never present on rows read via
 * `applications_public`, so omit when populating from that view.
 */
export interface Application {
  id: string;
  name: string;
  slug: ApplicationSlug;
  description: string;
  url: string | null;
  handoff_secret?: string;
  created_at: string;
}

/**
 * The permanent relationship between a person, a company, and an
 * application — never inferred from email or company name.
 */
export interface ApplicationAccess {
  id: string;
  user_id: string;
  company_id: string;
  application: ApplicationSlug;
  role: WellnessRole | PosRole | (string & {});
  status: ApplicationAccessStatus;
  activated_at: string | null;
  deactivated_at: string | null;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  created_at: string;
}

export type NotificationKind =
  | "NEW_ENQUIRY"
  | "FOLLOWUP_DUE"
  | "FOLLOWUP_OVERDUE"
  | "CONVERTED"
  | "APPLICATION_CREATED";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  entity_id: string | null;
  read: boolean;
  created_at: string;
}
