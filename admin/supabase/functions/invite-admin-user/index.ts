// Supabase Edge Function: invite-admin-user
//
// Called from services/adminUsers.ts. Uses the service-role key to send a
// Supabase Auth invite email and create the matching `profiles` row.
//
// Deploy with: supabase functions deploy invite-admin-user

import { createClient } from "npm:@supabase/supabase-js@2";

interface InviteRequest {
  first_name: string;
  last_name: string;
  email: string;
  role: "Super Admin" | "Admin" | "Sales" | "Support";
}

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const input = (await req.json()) as InviteRequest;

  const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    input.email
  );
  if (inviteError) {
    return new Response(JSON.stringify({ error: inviteError.message }), { status: 400 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: invited.user.id,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      role: input.role,
      status: "ACTIVE",
    })
    .select()
    .single();
  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), { status: 400 });
  }

  return new Response(JSON.stringify(profile), { headers: { "Content-Type": "application/json" } });
});
