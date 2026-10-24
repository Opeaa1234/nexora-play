-- Nexora Play: atomic move submission for live chess rooms.
-- Run this AFTER game-rooms.sql and secure-room-joining.sql.
create or replace function public.submit_chess_move(p_room_code text, p_move text)
returns table(room_code text, game_state jsonb, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_room public.game_rooms%rowtype;
  v_moves jsonb;
  v_count integer;
begin
  if v_user is null then raise exception 'Sign in to play.'; end if;
  if p_move !~ '^[a-h][1-8][a-h][1-8][qrbn]?$' then raise exception 'Invalid move format.'; end if;
  select * into v_room from public.game_rooms
    where public.game_rooms.room_code = upper(p_room_code)
    for update;
  if not found then raise exception 'Room not found.'; end if;
  if v_room.game_type <> 'chess' then raise exception 'This room is not a chess room.'; end if;
  if v_room.status <> 'playing' or v_room.guest_id is null then raise exception 'Waiting for the opponent to join.'; end if;
  if v_user <> v_room.host_id and v_user <> v_room.guest_id then raise exception 'You are not a player in this room.'; end if;
  v_moves := coalesce(v_room.game_state->'moves','[]'::jsonb);
  v_count := jsonb_array_length(v_moves);
  if (v_count % 2 = 0 and v_user <> v_room.host_id) or (v_count % 2 = 1 and v_user <> v_room.guest_id) then
    raise exception 'It is not your turn.';
  end if;
  v_moves := v_moves || jsonb_build_array(lower(p_move));
  update public.game_rooms
    set game_state = jsonb_build_object('version',1,'stage','playing','moves',v_moves),
        updated_at = pg_catalog.now()
    where id = v_room.id returning * into v_room;
  return query select v_room.room_code, v_room.game_state, v_room.status;
end;
$$;
revoke all on function public.submit_chess_move(text,text) from public, anon;
grant execute on function public.submit_chess_move(text,text) to authenticated;
