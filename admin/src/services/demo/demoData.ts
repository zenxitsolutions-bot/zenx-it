import { offsetIso, offsetDateOnly, offsetTimeOnly } from "../../utils/date";
import type {
  Profile,
  Enquiry,
  Interaction,
  Followup,
  Company,
  ZenxUser,
  Application,
  ApplicationAccess,
  AuditLog,
  AppNotification,
} from "../../types/domain";

export interface DemoState {
  profiles: Profile[];
  enquiries: Enquiry[];
  interactions: Interaction[];
  followups: Followup[];
  companies: Company[];
  zenxUsers: ZenxUser[];
  applications: Application[];
  applicationAccess: ApplicationAccess[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  currentUserId: string;
  /**
   * Demo-mode-only stand-in for Supabase Auth's password store, keyed by
   * ZenxUser id. Live mode never has an equivalent — Supabase Auth holds
   * passwords, hashed, and this app never reads them back.
   */
  customerPasswords: Record<string, string>;
}

const ADM = {
  aria: "adm_aria",
  marcus: "adm_marcus",
  priya: "adm_priya",
  diego: "adm_diego",
};

function profiles(): Profile[] {
  return [
    {
      id: ADM.aria,
      first_name: "Aria",
      last_name: "Chen",
      email: "aria@zenxitsolutions.com",
      role: "Super Admin",
      status: "ACTIVE",
      created_at: offsetIso(-400, 9),
    },
    {
      id: ADM.marcus,
      first_name: "Marcus",
      last_name: "Lee",
      email: "marcus@zenxitsolutions.com",
      role: "Admin",
      status: "ACTIVE",
      created_at: offsetIso(-320, 9),
    },
    {
      id: ADM.priya,
      first_name: "Priya",
      last_name: "Nair",
      email: "priya@zenxitsolutions.com",
      role: "Sales",
      status: "ACTIVE",
      created_at: offsetIso(-210, 9),
    },
    {
      id: ADM.diego,
      first_name: "Diego",
      last_name: "Ramos",
      email: "diego@zenxitsolutions.com",
      role: "Support",
      status: "ACTIVE",
      created_at: offsetIso(-90, 9),
    },
  ];
}

function applications(): Application[] {
  return [
    {
      id: "app_dietitian",
      name: "ZenX Dietitian",
      slug: "zenx-dietitian",
      description:
        "Client management, diet plans, weight progress and appointments for dietitians.",
      // Points at the actual wellness-app dev server running in this workspace, so opening a
      // customer's application in demo mode lands somewhere real instead of a placeholder domain.
      // In production this is the one base URL every company's link is built from — see
      // ApplicationsPage's "Edit URL" (customer links become {url}/{company-slug}).
      url: "http://localhost:5175",
      created_at: offsetIso(-400, 9),
    },
    {
      id: "app_pos",
      name: "ZenX Small Business POS",
      slug: "zenx-pos",
      description: "Point-of-sale, inventory and sales reporting for small businesses.",
      // No POS app exists in this workspace yet — placeholder until one is deployed and its URL
      // is set via ApplicationsPage.
      url: "https://pos.zenxit.demo",
      created_at: offsetIso(-400, 9),
    },
  ];
}

interface SeedEnquiry {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  website: string | null;
  service: Enquiry["service"];
  source: Enquiry["source"];
  status: Enquiry["status"];
  priority: Enquiry["priority"];
  assigned_to: string | null;
  estimated_value: number | null;
  createdDaysAgo: number;
}

const SEED_ENQUIRIES: SeedEnquiry[] = [
  { id: "enq_1", company_name: "Harbor & Vine Bistro", contact_name: "Lena Ortiz", phone: "+1 415 555 0111", email: "lena@harborvine.com", website: "harborvine.com", service: "Website", source: "Website", status: "NEW", priority: "MEDIUM", assigned_to: null, estimated_value: 4200, createdDaysAgo: 1 },
  { id: "enq_2", company_name: "Nova Fit Studio", contact_name: "Grace Kim", phone: "+1 646 555 0122", email: "grace@novafit.io", website: "novafit.io", service: "Digital Marketing", source: "Google", status: "NEW", priority: "HOT", assigned_to: null, estimated_value: 6800, createdDaysAgo: 0 },
  { id: "enq_3", company_name: "Pinecrest Family Clinic", contact_name: "Dr. Sam Whitfield", phone: "+1 312 555 0133", email: "sam@pinecrestclinic.com", website: null, service: "Business Software", source: "Referral", status: "NEW", priority: "HIGH", assigned_to: null, estimated_value: 15500, createdDaysAgo: 2 },
  { id: "enq_4", company_name: "Corner Loaf Bakery", contact_name: "Priyanka Das", phone: "+1 213 555 0144", email: "priyanka@cornerloaf.com", website: "cornerloaf.com", service: "Small Business POS", source: "Website", status: "NEW", priority: "MEDIUM", assigned_to: null, estimated_value: 2100, createdDaysAgo: 3 },
  { id: "enq_5", company_name: "Bright Path Tutors", contact_name: "Michael Osei", phone: "+1 617 555 0155", email: "michael@brightpathtutors.com", website: "brightpathtutors.com", service: "Website", source: "Website", status: "NEW", priority: "LOW", assigned_to: null, estimated_value: 1800, createdDaysAgo: 4 },

  { id: "enq_6", company_name: "Meridian Wellness Group", contact_name: "Dana Foster", phone: "+1 480 555 0166", email: "dana@meridianwellness.com", website: "meridianwellness.com", service: "ZenX Dietitian application", source: "Website", status: "CONTACTED", priority: "HIGH", assigned_to: ADM.priya, estimated_value: 5200, createdDaysAgo: 9 },
  { id: "enq_7", company_name: "Foothill Hardware Co.", contact_name: "Ray Bennett", phone: "+1 720 555 0177", email: "ray@foothillhardware.com", website: null, service: "Small Business POS", source: "Google", status: "CONTACTED", priority: "MEDIUM", assigned_to: ADM.marcus, estimated_value: 3400, createdDaysAgo: 12 },
  { id: "enq_8", company_name: "Solstice Digital Agency", contact_name: "Ines Moreau", phone: "+1 646 555 0188", email: "ines@solsticedigital.co", website: "solsticedigital.co", service: "Digital Marketing", source: "Website", status: "CONTACTED", priority: "MEDIUM", assigned_to: ADM.priya, estimated_value: 7600, createdDaysAgo: 15 },
  { id: "enq_9", company_name: "Ridgeline Outfitters", contact_name: "Tom Baxter", phone: "+1 303 555 0199", email: "tom@ridgelineoutfitters.com", website: "ridgelineoutfitters.com", service: "Website", source: "Facebook", status: "CONTACTED", priority: "LOW", assigned_to: ADM.marcus, estimated_value: 2600, createdDaysAgo: 18 },

  { id: "enq_10", company_name: "Amara Nutrition Clinic", contact_name: "Amara Yusuf", phone: "+1 917 555 0210", email: "amara@amaranutrition.com", website: "amaranutrition.com", service: "ZenX Dietitian application", source: "Website", status: "FOLLOW_UP", priority: "HOT", assigned_to: ADM.priya, estimated_value: 8200, createdDaysAgo: 22 },
  { id: "enq_11", company_name: "Union Street Cafe", contact_name: "Owen Fraser", phone: "+1 415 555 0221", email: "owen@unionstreetcafe.com", website: "unionstreetcafe.com", service: "Small Business POS", source: "Referral", status: "FOLLOW_UP", priority: "HIGH", assigned_to: ADM.marcus, estimated_value: 3100, createdDaysAgo: 28 },
  { id: "enq_12", company_name: "Skyline Property Group", contact_name: "Helena Cruz", phone: "+1 312 555 0232", email: "helena@skylinepg.com", website: "skylinepg.com", service: "Business Software", source: "Website", status: "FOLLOW_UP", priority: "MEDIUM", assigned_to: ADM.aria, estimated_value: 18400, createdDaysAgo: 35 },

  { id: "enq_13", company_name: "ABC Nutrition LLC", contact_name: "John Smith", phone: "+1 646 555 0243", email: "john@abcnutrition.com", website: "abcnutrition.com", service: "ZenX Dietitian application", source: "Referral", status: "CONVERTED", priority: "HOT", assigned_to: ADM.priya, estimated_value: 9600, createdDaysAgo: 52 },
  { id: "enq_14", company_name: "Maple & Co. Diner", contact_name: "Ellen Park", phone: "+1 206 555 0254", email: "ellen@mapleandco.com", website: "mapleandco.com", service: "Small Business POS", source: "Website", status: "CONVERTED", priority: "HIGH", assigned_to: ADM.marcus, estimated_value: 4100, createdDaysAgo: 61 },

  { id: "enq_15", company_name: "Vantage Legal Partners", contact_name: "Robert Klein", phone: "+1 202 555 0265", email: "robert@vantagelegal.com", website: "vantagelegal.com", service: "Something else", source: "Facebook", status: "LOST", priority: "LOW", assigned_to: ADM.marcus, estimated_value: 5000, createdDaysAgo: 45 },
];

function buildEnquiries(): Enquiry[] {
  return SEED_ENQUIRIES.map((s) => {
    const created = offsetIso(-s.createdDaysAgo, 10);
    const updated =
      s.status === "NEW" ? created : offsetIso(-Math.max(s.createdDaysAgo - 2, 0), 14);
    return {
      id: s.id,
      company_name: s.company_name,
      contact_name: s.contact_name,
      phone: s.phone,
      email: s.email,
      website: s.website,
      service: s.service,
      source: s.source,
      status: s.status,
      priority: s.priority,
      assigned_to: s.assigned_to,
      estimated_value: s.estimated_value,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      zip: null,
      country: null,
      notes: null,
      created_at: created,
      updated_at: updated,
      converted_at: s.status === "CONVERTED" ? offsetIso(-Math.max(s.createdDaysAgo - 6, 0), 11) : null,
      lost_at: s.status === "LOST" ? offsetIso(-Math.max(s.createdDaysAgo - 8, 0), 16) : null,
    };
  });
}

function buildInteractions(): Interaction[] {
  const mk = (
    id: string,
    enquiry_id: string,
    admin_id: string,
    daysAgo: number,
    hour: number,
    contact_type: Interaction["contact_type"],
    comment: string,
    outcome: Interaction["outcome"],
    next_action: string | null
  ): Interaction => ({
    id,
    enquiry_id,
    admin_id,
    contact_type,
    comment,
    outcome,
    next_action,
    created_at: offsetIso(-daysAgo, hour),
  });

  return [
    mk("int_1", "enq_6", ADM.priya, 8, 11, "Phone Call", "Called Dana about wellness platform needs. Interested in ZenX Dietitian for 3 practitioners.", "Interested", "Send Dietitian feature overview"),
    mk("int_2", "enq_7", ADM.marcus, 11, 15, "Email", "Sent POS pricing and hardware compatibility list.", "Needs More Information", "Follow up on hardware questions"),
    mk("int_3", "enq_8", ADM.priya, 14, 10, "Phone Call", "Discussed SEO + paid ads bundle. Ines wants a proposal.", "Proposal Requested", "Prepare proposal deck"),
    mk("int_4", "enq_9", ADM.marcus, 17, 13, "WhatsApp", "Quick chat about site revamp scope. Budget-conscious.", "Call Again", "Call back in two weeks"),

    mk("int_5", "enq_10", ADM.priya, 21, 9, "Phone Call", "Initial enquiry received. Interested in ZenX Dietitian for her clinic.", "Interested", "Schedule demo"),
    mk("int_6", "enq_10", ADM.priya, 6, 10, "Video Call", "Walked Amara through the Dietitian dashboard and diet plan builder. Very positive.", "Ready to Convert", "Send proposal and next-step call"),
    mk("int_7", "enq_11", ADM.marcus, 27, 9, "Phone Call", "Called Owen. Interested in POS + inventory for two locations.", "Interested", "Send another call next week"),
    mk("int_8", "enq_11", ADM.marcus, 5, 16, "Phone Call", "Owen confirmed budget approved by ownership. Wants to move forward.", "Ready to Convert", "Schedule onboarding call"),
    mk("int_9", "enq_12", ADM.aria, 34, 11, "Meeting", "On-site meeting to scope custom dashboard requirements for property management.", "Needs More Information", "Prepare technical scoping doc"),

    mk("int_10", "enq_13", ADM.priya, 51, 10, "Phone Call", "Called John. Interested in Website + Local SEO for ABC Nutrition.", "Interested", "Requested another call next week"),
    mk("int_11", "enq_13", ADM.priya, 44, 14, "Phone Call", "Follow-up call. John confirmed interest in ZenX Dietitian for his practice.", "Ready to Convert", "Prepare account creation"),
    mk("int_12", "enq_13", ADM.priya, 40, 9, "Email", "Sent onboarding details and welcome materials.", "Other", null),

    mk("int_13", "enq_14", ADM.marcus, 60, 9, "Phone Call", "Initial enquiry received. Interested in Digital Marketing.", "Interested", null),
    mk("int_14", "enq_14", ADM.marcus, 55, 13, "Phone Call", "Ellen decided POS was the bigger priority for now. Ready to sign up.", "Ready to Convert", "Create customer account"),

    mk("int_15", "enq_15", ADM.marcus, 44, 10, "Phone Call", "Spoke with Robert. Budget did not align with scope requested.", "Not Interested", null),
  ];
}

function buildFollowups(): Followup[] {
  return [
    {
      id: "fu_1",
      enquiry_id: "enq_10",
      assigned_to: ADM.priya,
      scheduled_date: offsetDateOnly(0),
      scheduled_time: offsetTimeOnly(16, 0),
      contact_method: "Video Call",
      notes: "Send proposal and confirm ZenX Dietitian plan tier before the call.",
      reminder: "1 hour before",
      status: "SCHEDULED",
      completed_at: null,
      created_at: offsetIso(-6, 10),
    },
    {
      id: "fu_2",
      enquiry_id: "enq_11",
      assigned_to: ADM.marcus,
      scheduled_date: offsetDateOnly(3),
      scheduled_time: offsetTimeOnly(11, 30),
      contact_method: "Phone Call",
      notes: "Onboarding walkthrough call for POS setup across both locations.",
      reminder: "1 day before",
      status: "SCHEDULED",
      completed_at: null,
      created_at: offsetIso(-5, 16),
    },
    {
      id: "fu_3",
      enquiry_id: "enq_12",
      assigned_to: ADM.aria,
      scheduled_date: offsetDateOnly(-2),
      scheduled_time: offsetTimeOnly(14, 0),
      contact_method: "Meeting",
      notes: "Review technical scoping doc with Helena and finance lead.",
      reminder: "30 minutes before",
      status: "SCHEDULED",
      completed_at: null,
      created_at: offsetIso(-9, 11),
    },
    {
      id: "fu_4",
      enquiry_id: "enq_6",
      assigned_to: ADM.priya,
      scheduled_date: offsetDateOnly(1),
      scheduled_time: offsetTimeOnly(10, 0),
      contact_method: "Phone Call",
      notes: "Check whether Dana has reviewed the feature overview sent last week.",
      reminder: "15 minutes before",
      status: "SCHEDULED",
      completed_at: null,
      created_at: offsetIso(-2, 9),
    },
    {
      id: "fu_5",
      enquiry_id: "enq_9",
      assigned_to: ADM.marcus,
      scheduled_date: offsetDateOnly(-1),
      scheduled_time: offsetTimeOnly(9, 30),
      contact_method: "WhatsApp",
      notes: "Circle back on budget-friendly package options.",
      reminder: "None",
      status: "SCHEDULED",
      completed_at: null,
      created_at: offsetIso(-4, 13),
    },
    {
      id: "fu_6",
      enquiry_id: "enq_13",
      assigned_to: ADM.priya,
      scheduled_date: offsetDateOnly(-44),
      scheduled_time: offsetTimeOnly(14, 0),
      contact_method: "Phone Call",
      notes: "Follow-up on Website + Local SEO interest.",
      reminder: "None",
      status: "COMPLETED",
      completed_at: offsetIso(-44, 14),
      created_at: offsetIso(-51, 10),
    },
  ];
}

function buildCompanies(): Company[] {
  return [
    {
      id: "co_1",
      enquiry_id: "enq_13",
      company_name: "ABC Nutrition LLC",
      company_slug: "abc-nutrition",
      company_email: "john@abcnutrition.com",
      company_phone: "+1 646 555 0243",
      website: "abcnutrition.com",
      logo_url: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      zip: null,
      country: null,
      status: "ACTIVE",
      created_at: offsetIso(-38, 10),
      updated_at: offsetIso(-38, 10),
    },
    {
      id: "co_2",
      enquiry_id: "enq_14",
      company_name: "Maple & Co. Diner",
      company_slug: "maple-co-diner",
      company_email: "ellen@mapleandco.com",
      company_phone: "+1 206 555 0254",
      website: "mapleandco.com",
      logo_url: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      zip: null,
      country: null,
      status: "ACTIVE",
      created_at: offsetIso(-50, 11),
      updated_at: offsetIso(-50, 11),
    },
  ];
}

function buildZenxUsers(): ZenxUser[] {
  return [
    {
      id: "usr_john",
      email: "john@abcnutrition.com",
      first_name: "John",
      last_name: "Smith",
      phone: "+1 646 555 0243",
      job_title: "Owner",
      status: "ACTIVE",
      must_change_password: false,
      created_at: offsetIso(-38, 10),
      updated_at: offsetIso(-38, 10),
      last_login: offsetIso(-1, 8),
    },
    {
      id: "usr_ellen",
      email: "ellen@mapleandco.com",
      first_name: "Ellen",
      last_name: "Park",
      phone: "+1 206 555 0254",
      job_title: "Owner",
      status: "ACTIVE",
      must_change_password: false,
      created_at: offsetIso(-50, 11),
      updated_at: offsetIso(-50, 11),
      last_login: offsetIso(-3, 19),
    },
  ];
}

// Matches customerAuth.ts's CUSTOMER_DEMO_PASSWORD — both pre-seeded demo customers already have
// an established password (they've logged in before, see last_login above), so they keep sharing
// the documented demo password rather than needing a fresh temp password of their own.
const SEEDED_CUSTOMER_PASSWORD = "ZenXCustomerDemo123!";

function buildApplicationAccess(): ApplicationAccess[] {
  return [
    { id: "aa_1", user_id: "usr_john", company_id: "co_1", application: "zenx-dietitian", role: "wellness_admin", status: "ACTIVE", activated_at: offsetIso(-38, 10), deactivated_at: null },
    { id: "aa_2", user_id: "usr_john", company_id: "co_1", application: "zenx-pos", role: "pos_admin", status: "ACTIVE", activated_at: offsetIso(-38, 10), deactivated_at: null },
    { id: "aa_3", user_id: "usr_ellen", company_id: "co_2", application: "zenx-pos", role: "pos_admin", status: "ACTIVE", activated_at: offsetIso(-50, 11), deactivated_at: null },
  ];
}

function buildAuditLogs(): AuditLog[] {
  return [
    { id: "log_1", admin_id: ADM.priya, action: "CONVERT_LEAD", entity_type: "enquiry", entity_id: "enq_13", description: "Converted ABC Nutrition LLC to a customer.", created_at: offsetIso(-38, 10) },
    { id: "log_2", admin_id: ADM.priya, action: "CREATE_COMPANY", entity_type: "company", entity_id: "co_1", description: "Created company ABC Nutrition LLC and invited its Wellness Admin.", created_at: offsetIso(-38, 10) },
    { id: "log_3", admin_id: ADM.priya, action: "GRANT_APPLICATION_ACCESS", entity_type: "application_access", entity_id: "aa_1", description: "Activated ZenX Dietitian access for ABC Nutrition LLC.", created_at: offsetIso(-38, 10) },
    { id: "log_4", admin_id: ADM.marcus, action: "CONVERT_LEAD", entity_type: "enquiry", entity_id: "enq_14", description: "Converted Maple & Co. Diner to a customer.", created_at: offsetIso(-50, 11) },
    { id: "log_5", admin_id: ADM.marcus, action: "GRANT_APPLICATION_ACCESS", entity_type: "application_access", entity_id: "aa_3", description: "Activated ZenX POS access for Maple & Co. Diner.", created_at: offsetIso(-50, 11) },
    { id: "log_6", admin_id: ADM.marcus, action: "MARK_LOST", entity_type: "enquiry", entity_id: "enq_15", description: "Marked Vantage Legal Partners as lost.", created_at: offsetIso(-37, 16) },
  ];
}

function buildNotifications(): AppNotification[] {
  return [
    { id: "notif_1", kind: "NEW_ENQUIRY", title: "New enquiry", body: "Nova Fit Studio just submitted an enquiry.", entity_id: "enq_2", read: false, created_at: offsetIso(0, 8) },
    { id: "notif_2", kind: "NEW_ENQUIRY", title: "New enquiry", body: "Harbor & Vine Bistro just submitted an enquiry.", entity_id: "enq_1", read: false, created_at: offsetIso(-1, 9) },
    { id: "notif_3", kind: "FOLLOWUP_DUE", title: "Follow-up due today", body: "Amara Nutrition Clinic â€” follow-up scheduled for today.", entity_id: "fu_1", read: false, created_at: offsetIso(0, 8) },
    { id: "notif_4", kind: "FOLLOWUP_OVERDUE", title: "Follow-up overdue", body: "Skyline Property Group â€” follow-up is overdue.", entity_id: "fu_3", read: false, created_at: offsetIso(-1, 15) },
    { id: "notif_5", kind: "FOLLOWUP_OVERDUE", title: "Follow-up overdue", body: "Ridgeline Outfitters â€” follow-up is overdue.", entity_id: "fu_5", read: true, created_at: offsetIso(-1, 10) },
    { id: "notif_6", kind: "CONVERTED", title: "Lead converted", body: "ABC Nutrition LLC converted to a customer.", entity_id: "enq_13", read: true, created_at: offsetIso(-38, 10) },
    { id: "notif_7", kind: "APPLICATION_CREATED", title: "Application access created", body: "ZenX Dietitian access activated for ABC Nutrition LLC.", entity_id: "aa_1", read: true, created_at: offsetIso(-38, 10) },
  ];
}

export function generateSeed(): DemoState {
  return {
    profiles: profiles(),
    enquiries: buildEnquiries(),
    interactions: buildInteractions(),
    followups: buildFollowups(),
    companies: buildCompanies(),
    zenxUsers: buildZenxUsers(),
    applications: applications(),
    applicationAccess: buildApplicationAccess(),
    auditLogs: buildAuditLogs(),
    notifications: buildNotifications(),
    currentUserId: ADM.aria,
    customerPasswords: {
      usr_john: SEEDED_CUSTOMER_PASSWORD,
      usr_ellen: SEEDED_CUSTOMER_PASSWORD,
    },
  };
}

export const DEMO_ADMIN_IDS = ADM;
