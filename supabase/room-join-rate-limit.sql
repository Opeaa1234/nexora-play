-- Nexora Play: per-user room-code guessing protection.
-- Apply ONLY in an isolated staging Supabase project after secure-room-joining.sql.
-- This file changes the join RPC return shape; deploy the matching rooms.html in the same release.
-- It is intentionally not applied to any live database by this repository change.

create table if not exists public.room_join_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default pg_catalog.now(),
  attempts integer not null default 0 check (attempts >= 0),
  updated_at timestamptz not null default pg_catalog.now()
);

alter table public.room_join_rate_limits enable row level security;
revoke all on table public.room_join_rate_limits from public, anon, authenticated;

-- Drop is required because PostgreSQL cannot change a function's TABLE return shape
-- with CREATE OR REPLACE. The matching lobby handles the added join_error column.
drop function if exists public.join_game_room(text);

create function public.join_game_room(p_room_code text)
returns table (
  id uuid,
  room_code text,
  game_type text,
  host_id uuid,
  guest_id uuid,
  status text,
  join_error text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_room public.game_rooms%rowtype;
  v_attempts integer;
begin
  if v_user_id is null then
    return query select null::uuid, null::text, null::text, null::uuid, null::uuid, null::text, 'Please sign in before joining a room.'::text;
    return;
  end if;

  -- One row per user serializes concurrent attempts and resets after a fixed 10-minute window.
  insert into public.room_join_rate_limits as limits
    (user_id, window_started_at, attempts, updated_at)
  values (v_user_id, pg_catalog.now(), 1, pg_catalog.now())
  on conflict (user_id) do update set
    window_started_at = case
      when limits.window_started_at <= pg_catalog.now() - interval '10 minutes'
      then pg_catalog.now() else limits.window_started_at end,
    attempts = case
      when limits.window_started_at <= pg_catalog.now() - interval '10 minutes'
      then 1 else limits.attempts + 1 end,
    updated_at = pg_catalog.now()
  returning limits.attempts into v_attempts;

  if v_attempts > 10 then
    return query select null::uuid, null::text, null::text, null::uuid, null::uuid, null::text,
      'Too many room-join attempts. Please wait 10 minutes before trying again.'::text;
    return;
  end if;

  -- Keep the attempt counter outside this exception block: a rejected join must
  -- still count, while a failed room mutation is rolled back by the subtransaction.
  begin
    if p_room_code is null or upper(trim(p_room_code)) !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then
      return query select null::uuid, null::text, null::text, null::uuid, null::uuid, null::text,
        'Enter a valid six-character room code.'::text;
      return;
    end if;

    select * into v_room
    from public.game_rooms
    where public.game_rooms.room_code = upper(trim(p_room_code))
    for update;

    if not found then
      return query select null::uuid, null::text, null::text, null::uuid, null::uuid, null::text,
        'No room found for that code.'::text;
      return;
    end if;
    if v_room.host_id = v_user_id then
      return query select null::uuid, null::text, null::text, null::uuid, null::uuid, null::text,
        'You are the host of this room.'::text;
      return;
    end if;
    if v_room.status is distinct from 'waiting' then
      return query select null::uuid, null::text, null::text, null::uuid, null::uuid, null::text,
        'This room is no longer waiting for a player.'::text;
      return;
    end if;
    if v_room.guest_id is not null and v_room.guest_id <> v_user_id then
      return query select null::uuid, null::text, null::text, null::uuid, null::uuid, null::text,
        'This room already has an opponent.'::text;
      return;
    end if;

    if v_room.guest_id is null then
      update public.game_rooms
        set guest_id = v_user_id, status = 'playing', updated_at = pg_catalog.now()
        where public.game_rooms.id = v_room.id
        returning * into v_room;
    end if;

    return query select v_room.id, v_room.room_code, v_room.game_type,
      v_room.host_id, v_room.guest_id, v_room.status, null::text;
  exception when others then
    -- Do not expose SQL details to an untrusted caller.
    return query select null::uuid, null::text, null::text, null::uuid, null::uuid, null::text,
      'Could not join the room right now. Please try again.'::text;
  end;
end;
$$;

revoke all on function public.join_game_room(text) from public, anon;
grant execute on function public.join_game_room(text) to authenticated;

-- Operational note: the table retains only one rolling counter per account.
-- Deleted accounts cascade-delete their rows. Old inactive rows may be pruned
-- periodically in staging/operations after reviewing retention requirements.
