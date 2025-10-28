-- Create org table and policies
create table if not exists public.org (
  id uuid primary key default gen_random_uuid(),
  org_name text not null,
  org_logo text
);

alter table public.org enable row level security;

-- Helper: check if current user is admin (based on profiles table)
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

-- Public read
drop policy if exists org_select_public on public.org;
create policy org_select_public on public.org
  for select using (true);

-- Admin can insert/update/delete
drop policy if exists org_admin_write on public.org;
create policy org_admin_write on public.org
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
