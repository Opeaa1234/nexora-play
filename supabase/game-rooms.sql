-- Nexora Play: Host/Join rooms foundation for Chess and Draughts.
-- Run this in Supabase Dashboard > SQL Editor.
create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique check (room_code ~ '^[A-Z0-9]{6}$'),
  game_type text not null check (game_type in ('chess', 'draughts')),
  host_id uuid not null references auth.users(id) on delete cascade,
  guest_id uuid references auth.users(id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished', 'cancelled')),
  is_public boolean not null default true,
  game_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint different_players check (guest_id is null or guest_id <> host_id)
);
create index if not exists game_rooms_waiting_public_idx
  on public.game_rooms (game_type, created_at desc)
  where status = 'waiting' and is_public = true;
create index if not exists game_rooms_host_idx on public.game_rooms(host_id);
create index if not exists game_rooms_guest_idx on public.game_rooms(guest_id);

alter table public.game_rooms enable row level security;
revoke all on public.game_rooms from anon, authenticated;
grant select, insert, update on public.game_rooms to authenticated;

drop policy if exists "Players can view available or joined rooms" on public.game_rooms;
create policy "Players can view available or joined rooms"
on public.game_rooms for select to authenticated
using (
  (is_public = true and status = 'waiting')
  or host_id = (select auth.uid())
  or guest_id = (select auth.uid())
);

drop policy if exists "Players can host their own rooms" on public.game_rooms;
create policy "Players can host their own rooms"
on public.game_rooms for insert to authenticated
with check (host_id = (select auth.uid()) and guest_id is null and status = 'waiting');

drop policy if exists "Host or guest can update their room" on public.game_rooms;
create policy "Host or guest can update their room"
on public.game_rooms for update to authenticated
using (host_id = (select auth.uid()) or guest_id = (select auth.uid()))
with check (host_id = (select auth.uid()) or guest_id = (select auth.uid()));

-- Realtime Postgres Changes: enable this table in the supabase_realtime publication
-- after running the SQL, from Database > Publications in Supabase Dashboard.
