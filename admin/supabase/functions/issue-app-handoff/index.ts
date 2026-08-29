// Supabase Edge Function: issue-app-handoff
//
// Called from the central customer login/launcher pages once a person is
// authenticated via Supabase Auth. Mints a short-lived, per-grant-secret
// signed token that the target application (e.g. the shared wellness-app
// deployment) can verify to establish a local session scoped to the right
// company_id — without ever exposing handoff_secret to the browser.
//
// Deploy with: supabase functions deploy issue-app-handoff
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (set via
// `supabase secrets set`), available automatically as env vars in most
// Supabase-managed function deployments.

import { createClient } from "npm:@supabase/supabase-js@2";
import jwt from "npm:jsonwebtoken@9";

interface HandoffRequest {
  applicationSlug: string;
  // A person can belong to more than one company, so applicationSlug alone
  // doesn't uniquely identify a grant — the caller (LauncherPage/CustomerLoginPage)
  // already knows which company's card they clicked.
  companyId: string;
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const callerToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!callerToken) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Resolve the caller's identity from their own session token — never trust
  // a user/company id passed in the request body for *who* is asking.
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(callerToken);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
  }

  const input = (await req.json()) as HandoffRequest;

  const { data: user, error: userRowError } = await supabaseAdmin
    .from("users")
    .select("id, first_name, last_name, email, status")
    .eq("id", userData.user.id)
    .single();
  if (userRowError || !user) {
    return new Response(JSON.stringify({ error: "No account found for this login." }), { status: 403 });
  }
  if (user.status !== "ACTIVE") {
    return new Response(JSON.stringify({ error: "This account has been disabled." }), { status: 403 });
  }

  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("id, company_name, company_slug, logo_url, status")
    .eq("id", input.companyId)
    .single();
  if (companyError || !company) {
    return new Response(JSON.stringify({ error: "Unknown company." }), { status: 404 });
  }
  if (company.status !== "ACTIVE") {
    return new Response(JSON.stringify({ error: "This company has been deactivated." }), { status: 403 });
  }

  const { data: grant, error: grantError } = await supabaseAdmin
    .from("application_access")
    .select("role, status")
    .eq("user_id", user.id)
    .eq("company_id", company.id)
    .eq("application", input.applicationSlug)
    .single();
  if (grantError || !grant || grant.status !== "ACTIVE") {
    return new Response(JSON.stringify({ error: "You don't have access to this application." }), { status: 403 });
  }

  // url/handoff_secret are per-APPLICATION (one shared deployment serving every company), not
  // per-grant — see schema.sql's comment on `applications`.
  const { data: app, error: appError } = await supabaseAdmin
    .from("applications")
    .select("url, handoff_secret")
    .eq("slug", input.applicationSlug)
    .single();
  if (appError || !app) {
    return new Response(JSON.stringify({ error: "Unknown application." }), { status: 404 });
  }
  if (!app.url || !app.handoff_secret) {
    return new Response(
      JSON.stringify({ error: "This application has not been deployed yet." }),
      { status: 409 }
    );
  }

  // Short-lived (60s), single-use (jti), signed with this application's shared secret. company_id
  // (not company_slug) is the claim the receiving application actually trusts for tenant
  // isolation — the slug travels along only for routing/display.
  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      contact_name: `${user.first_name} ${user.last_name}`.trim(),
      role: grant.role,
      company_id: company.id,
      company_slug: company.company_slug,
      company_name: company.company_name,
      logo_url: company.logo_url,
      jti: crypto.randomUUID(),
    },
    app.handoff_secret,
    { expiresIn: "60s" }
  );

  const base = app.url.replace(/\/$/, "");
  const url = `${base}/${company.company_slug}/handoff?token=${encodeURIComponent(token)}`;

  return new Response(JSON.stringify({ url }), { headers: { "Content-Type": "application/json" } });
});
