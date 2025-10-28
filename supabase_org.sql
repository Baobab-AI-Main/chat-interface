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
  select exists (select 1 from public.users u where u.user_id = auth.uid() and u.role = 'admin');
$$;

-- Public read
drop policy if exists org_select_public on public.org;
create policy org_select_public on public.org
  for select using (true);

-- Admin can insert/update/delete
drop policy if exists org_admin_write on public.org;
create policy org_admin_write on public.org
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Helper function to upsert org with SECURITY DEFINER to bypass RLS for admins
create or replace function public.upsert_org(p_name text, p_logo text)
returns public.org
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists(select 1 from public.org) then
    update public.org set org_name = coalesce(p_name, org_name), org_logo = coalesce(p_logo, org_logo)
    where id in (select id from public.org limit 1)
    returning * into strictly upsert_org;
    return upsert_org;
  else
    insert into public.org (org_name, org_logo)
    values (coalesce(p_name, 'Workspace'), p_logo)
    returning * into strictly upsert_org;
    return upsert_org;
  end if;
end;
$$;

revoke all on function public.upsert_org(text, text) from public;
grant execute on function public.upsert_org(text, text) to authenticated;
