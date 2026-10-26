-- Nexora Play: server-validated atomic chess move submission.
-- Apply this SQL in Supabase after game-rooms.sql and secure-room-joining.sql.
-- Deploy supabase/functions/submit-chess-move before enabling live chess.
-- The Edge Function replays the complete history with chess.js and validates each move.
-- This RPC is service-role-only to prevent clients bypassing the validator.

drop function if exists public.submit_chess_move(text, text);
drop function if exists public.submit_validated_chess_move(text, text, jsonb, jsonb, text);

create function public.submit_validated_chess_move(
  p_room_code text,
  p_move text,
  p_expected_moves jsonb,
  p_next_state jsonb,
  p_next_status text
)
returns table(room_code text, game_state jsonb, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.game_rooms%rowtype;
  v_current_moves jsonb;
  v_next_moves jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Chess moves must be submitted through the server validator.';
  end if;
  if p_room_code is null or p_room_code !~ '^[A-Za-z0-9]{6}$' then
    raise exception 'Invalid room code.';
  end if;
  if p_move is null or p_move !~ '^[a-h][1-8][a-h][1-8][qrbn]?$' then
    raise exception 'Invalid move format.';
  end if;
  if p_expected_moves is null
     or jsonb_typeof(p_expected_moves) <> 'array'
     or p_next_state is null
     or jsonb_typeof(p_next_state) <> 'object'
     or jsonb_typeof(p_next_state->'moves') <> 'array' then
    raise exception 'Invalid chess state payload.';
  end if;
  if p_next_status is null or p_next_status not in ('playing', 'finished') then
    raise exception 'Invalid chess room status.';
  end if;

  select * into v_room
  from public.game_rooms
  where public.game_rooms.room_code = upper(trim(p_room_code))
  for update;

  if not found then raise exception 'Room not found.'; end if;
  if v_room.game_type <> 'chess' then raise exception 'This room is not a chess room.'; end if;
  if v_room.status <> 'playing' or v_room.guest_id is null then
    raise exception 'This chess room is not currently playing.';
  end if;

  v_current_moves := coalesce(v_room.game_state->'moves', '[]'::jsonb);
  if v_current_moves is distinct from p_expected_moves then
    raise exception 'The chess position changed. Refresh and try again.';
  end if;

  v_next_moves := v_current_moves || jsonb_build_array(lower(p_move));
  if p_next_state->'moves' is distinct from v_next_moves then
    raise exception 'The validated move history does not match the current position.';
  end if;

  update public.game_rooms
  set game_state = p_next_state,
      status = p_next_status,
      updated_at = pg_catalog.now()
  where id = v_room.id
  returning * into v_room;

  return query select v_room.room_code, v_room.game_state, v_room.status;
end;
$$;

revoke all on function public.submit_validated_chess_move(text, text, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_validated_chess_move(text, text, jsonb, jsonb, text) to service_role;
