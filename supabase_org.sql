-- Create org table and policies
create table if not exists public.org (
  id uuid primary key default gen_random_uuid(),
  org_name text not null,
  org_logo text
);

alter table public.org enable row level security;

-- Helper: check if current user is admin via JWT claim set at signup
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce(((current_setting('request.jwt.claims', true)::jsonb)->>'role') = 'admin', false);
$$;

-- Public read
create policy org_select_public on public.org
  for select using (true);

-- Admin can insert/update/delete
create policy org_admin_write on public.org
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
