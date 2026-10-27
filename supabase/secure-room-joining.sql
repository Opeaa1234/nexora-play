-- Nexora Play: tighten room permissions and join rooms atomically.
-- Run AFTER game-rooms.sql in Supabase SQL Editor.
-- Joining happens through this function so clients cannot directly edit room fields.

revoke update on table public.game_rooms from authenticated;

drop policy if exists "Host or guest can update their room" on public.game_rooms;
drop policy if exists "Players can join an open room" on public.game_rooms;

create or replace function public.join_game_room(p_room_code text)
returns table (id uuid, room_code text, game_type text, host_id uuid, guest_id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_room public.game_rooms%rowtype;
begin
  if v_user_id is null then
    raise exception 'Please sign in before joining a room.';
  end if;

  select * into v_room
  from public.game_rooms
  where public.game_rooms.room_code = upper(trim(p_room_code))
  for update;

  if not found then
    raise exception 'No room found for that code.';
  end if;
  if v_room.host_id = v_user_id then
    raise exception 'You are the host of this room.';
  end if;
  if v_room.status is distinct from 'waiting' then
    raise exception 'This room is no longer waiting for a player.';
  end if;
  if v_room.guest_id is not null and v_room.guest_id <> v_user_id then
    raise exception 'This room already has an opponent.';
  end if;

  if v_room.guest_id is null then
    update public.game_rooms
      set guest_id = v_user_id, status = 'playing', updated_at = now()
      where public.game_rooms.id = v_room.id
      returning * into v_room;
  end if;

  return query select v_room.id, v_room.room_code, v_room.game_type,
    v_room.host_id, v_room.guest_id, v_room.status;
end;
$$;

revoke all on function public.join_game_room(text) from public, anon;
grant execute on function public.join_game_room(text) to authenticated;
