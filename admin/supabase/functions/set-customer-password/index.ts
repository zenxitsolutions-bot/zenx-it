// Supabase Edge Function: set-customer-password
//
// Called from services/companies.ts (Reset Password, and indirectly at
// creation via create-customer-account). Sets a person's password directly —
// no email round-trip — and flags must_change_password so they're forced to
// choose their own on next login. Runs with the service-role key so it can
// call auth.admin.updateUserById; the plaintext password passes through this
// function once and is never written anywhere but Supabase Auth (hashed).
//
// Deploy with: supabase functions deploy set-customer-password

import { createClient } from "npm:@supabase/supabase-js@2";

interface SetPasswordRequest {
  userId: string;
  password: string;
}

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { userId, password } = (await req.json()) as SetPasswordRequest;

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), { status: 400 });
  }

  const { error: dbError } = await supabaseAdmin
    .from("users")
    .update({ must_change_password: true })
    .eq("id", userId);
  if (dbError) {
    return new Response(JSON.stringify({ error: dbError.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
