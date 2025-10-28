-- Create public buckets for org logos and user avatars
insert into storage.buckets (id, name, public) values ('org','org', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars','avatars', true)
  on conflict (id) do nothing;

-- Allow public read from these buckets
create policy if not exists storage_org_read on storage.objects
  for select using (bucket_id = 'org');
create policy if not exists storage_avatars_read on storage.objects
  for select using (bucket_id = 'avatars');

-- Admins can write to org bucket
create policy if not exists storage_org_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'org' and public.is_admin())
  with check (bucket_id = 'org' and public.is_admin());

-- Authenticated users can write to avatars bucket
create policy if not exists storage_avatars_auth_write on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');
