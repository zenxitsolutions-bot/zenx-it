-- ZenX Admin Portal — company logo storage
-- Run after schema.sql/rls.sql, before or after seed.sql (order doesn't matter for this file).

insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

-- Public read (logos aren't sensitive — they're shown pre-authentication on login pages).
-- Write restricted to active admins (Support included — logo management isn't a
-- destructive/financial action, unlike the company-status and application-access writes that
-- explicitly exclude Support elsewhere in rls.sql).
create policy "company_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'company-logos');

create policy "company_logos_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'company-logos' and is_active_admin());

create policy "company_logos_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'company-logos' and is_active_admin());

create policy "company_logos_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'company-logos' and is_active_admin());
