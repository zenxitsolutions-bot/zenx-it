// Supabase Edge Function: create-customer-account
//
// Called from services/provisioning.ts via `supabase.functions.invoke(...)`.
// Runs with the service-role key (set as an env var on the Edge Function,
// NEVER shipped to the browser) so it can create an auth user and write the
// companies/users/application_access rows in one trusted place.
//
// The admin sets a temporary password (generated client-side, shown once in
// the admin UI right after this call returns) — the customer is required to
// change it on their first successful login (see users.must_change_password).
// The password itself is never stored anywhere but Supabase Auth (hashed);
// this function receives it once, hands it to auth.admin.createUser, and
// never writes it anywhere else.
//
// Deploy with: supabase functions deploy create-customer-account
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (set via
// `supabase secrets set`), available automatically as env vars in most
// Supabase-managed function deployments.

import { createClient } from "npm:@supabase/supabase-js@2";

interface ProvisionRequest {
  enquiryId: string | null;
  companyName: string;
  companySlug: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  jobTitle: string;
  applicationSlugs: string[];
  adminId: string;
  password: string;
}

// Wellness/POS both currently grant the company's first person the "admin" role for that
// application — dietitians/clients (or POS staff) are created later, inside that application
// itself, never from ZenX (see ConvertFlow.tsx's comment on this same rule).
function defaultRoleFor(applicationSlug: string): string {
  return applicationSlug === "zenx-pos" ? "pos_admin" : "wellness_admin";
}

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const input = (await req.json()) as ProvisionRequest;

  // 1. Create the company.
  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .insert({
      enquiry_id: input.enquiryId,
      company_name: input.companyName,
      company_slug: input.companySlug,
      company_email: input.email,
      company_phone: input.phone,
      status: "ACTIVE",
    })
    .select()
    .single();
  if (companyError) {
    return new Response(JSON.stringify({ error: companyError.message }), { status: 400 });
  }

  // 2. Create the person's auth.users row with the admin-set temporary password.
  // email_confirm: true — they're logging in with a password an admin just handed them directly,
  // not proving inbox ownership via a link, so there's no confirmation step to gate on.
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { first_name: input.firstName, last_name: input.lastName, company_name: input.companyName },
  });
  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), { status: 400 });
  }

  // 3. Create their permanent zenx_user_id identity. must_change_password starts true — cleared
  // by the customer-facing change-password screen the first time they sign in.
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .insert({
      id: authUser.user.id,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      job_title: input.jobTitle || null,
      status: "ACTIVE",
      must_change_password: true,
    })
    .select()
    .single();
  if (userError) {
    return new Response(JSON.stringify({ error: userError.message }), { status: 400 });
  }

  // 4. Grant application access. url/handoff_secret live on `applications` (one shared deployment
  // per application, not per grant — see issue-app-handoff), so nothing sensitive is written here.
  const grants = input.applicationSlugs.map((slug) => ({
    user_id: user.id,
    company_id: company.id,
    application: slug,
    role: defaultRoleFor(slug),
    status: "ACTIVE",
    activated_at: new Date().toISOString(),
  }));

  const { data: insertedGrants, error: grantError } = await supabaseAdmin
    .from("application_access")
    .insert(grants)
    .select("id, user_id, company_id, application, role, status, activated_at, deactivated_at");
  if (grantError) {
    return new Response(JSON.stringify({ error: grantError.message }), { status: 400 });
  }

  await supabaseAdmin.from("audit_logs").insert({
    admin_id: input.adminId,
    action: "CREATE_COMPANY",
    entity_type: "company",
    entity_id: company.id,
    description: `Created company ${input.companyName} and set a temporary password for ${input.firstName} ${input.lastName}.`,
  });

  return new Response(JSON.stringify({ company, user, grants: insertedGrants }), {
    headers: { "Content-Type": "application/json" },
  });
});
