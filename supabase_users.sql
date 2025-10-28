-- Users table with requested column names and RLS
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text unique not null,
  role text not null check (role in ('admin','user')),
  "Full Name" text,
  "Profile_Photo" text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Policies
create policy if not exists users_select_auth on public.users for select to authenticated using (true);
create policy if not exists users_update_self on public.users for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists users_admin_all on public.users for all to authenticated using (public.is_admin()) with check (public.is_admin());
