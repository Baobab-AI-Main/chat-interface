-- Teams and team members
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

-- Anyone authenticated can read teams and members
create policy if not exists teams_select_auth on public.teams for select to authenticated using (true);
create policy if not exists team_members_select_auth on public.team_members for select to authenticated using (true);

-- Admins can manage teams and members
create policy if not exists teams_admin_all on public.teams for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy if not exists team_members_admin_all on public.team_members for all to authenticated using (public.is_admin()) with check (public.is_admin());
