create table if not exists public.profiles (
  id uuid primary key,
  email text unique not null,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_read_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_admin_read_all on public.profiles;
create policy profiles_read_own on public.profiles for select using (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id);
create policy profiles_admin_read_all on public.profiles for select to authenticated using (((current_setting('request.jwt.claims', true)::jsonb)->>'role') = 'admin');

insert into public.profiles (id,email,role) values
  ('f8fae3b9-a4ce-4f5c-907b-7314011d1214','team@niya.ai','admin')
  on conflict (id) do update set email=excluded.email, role=excluded.role,
    updated_at=now();
insert into public.profiles (id,email,role) values
  ('84c604d6-fadc-4ffa-85f6-027e445ef2dd','tanveer@niya.ai','user')
  on conflict (id) do update set email=excluded.email, role=excluded.role,
    updated_at=now();
