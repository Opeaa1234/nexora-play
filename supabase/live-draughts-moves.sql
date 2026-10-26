-- Nexora Play: server-checked Draughts move submission.
-- Run only after game-rooms.sql and secure-room-joining.sql.
-- Board indices are 0..63, row-major from top-left. Red men move toward row 0;
-- Black men move toward row 7. Kings move in both directions.
create or replace function public.submit_draughts_move(p_room_code text, p_from integer, p_to integer)
returns table(room_code text, game_state jsonb, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_room public.game_rooms%rowtype;
  b text[] := array_fill(null::text, array[64]);
  v_board jsonb;
  v_piece text;
  v_target text;
  v_turn text;
  v_forced integer;
  v_capture integer := null;
  v_must_capture boolean := false;
  v_has_jump boolean := false;
  v_king boolean;
  v_red boolean;
  v_dr integer;
  v_dc integer;
  v_r integer;
  v_c integer;
  v_tr integer;
  v_tc integer;
  v_mid_r integer;
  v_mid_c integer;
  v_mid integer;
  rr integer;
  cc integer;
  dr integer;
  dc integer;
  idx integer;
  v_next_forced integer := null;
  v_next_turn text;
  v_moves jsonb;
  v_new_state jsonb;
  v_any_move boolean := false;
  v_winner text := null;
begin
  if v_user is null then raise exception 'Sign in to play.'; end if;
  if p_from < 0 or p_from > 63 or p_to < 0 or p_to > 63 or p_from = p_to then
    raise exception 'Invalid board square.';
  end if;

  select * into v_room from public.game_rooms
   where public.game_rooms.room_code = upper(trim(p_room_code))
   for update;
  if not found then raise exception 'Room not found.'; end if;
  if v_room.game_type <> 'draughts' then raise exception 'This room is not a Draughts room.'; end if;
  if v_room.status <> 'playing' or v_room.guest_id is null then raise exception 'Waiting for the second player.'; end if;
  if v_user <> v_room.host_id and v_user <> v_room.guest_id then raise exception 'You are not a player in this room.'; end if;

  v_board := v_room.game_state->'board';
  if coalesce(jsonb_typeof(v_board), 'null') <> 'array' or jsonb_array_length(v_board) <> 64 then
    for idx in 0..63 loop
      if ((idx / 8 + idx % 8) % 2) = 1 then
        if idx / 8 < 3 then b[idx+1] := 'b';
        elsif idx / 8 > 4 then b[idx+1] := 'r';
        end if;
      end if;
    end loop;
    v_turn := 'r';
    v_forced := null;
    v_moves := '[]'::jsonb;
  else
    for idx in 0..63 loop
      if (v_board->idx) is not null and (v_board->idx) <> 'null'::jsonb then
        b[idx+1] := v_board->>idx;
      end if;
    end loop;
    v_turn := coalesce(v_room.game_state->>'turn','r');
    v_forced := nullif(v_room.game_state->>'forced_from','')::integer;
    v_moves := coalesce(v_room.game_state->'moves','[]'::jsonb);
  end if;

  if (v_turn = 'r' and v_user <> v_room.host_id) or (v_turn = 'b' and v_user <> v_room.guest_id) then
    raise exception 'It is not your turn.';
  end if;
  v_piece := b[p_from+1];
  if v_piece is null or lower(v_piece) <> v_turn then raise exception 'Choose one of your own pieces.'; end if;
  if v_forced is not null and v_forced <> p_from then raise exception 'Continue the multi-jump with the same piece.'; end if;
  if b[p_to+1] is not null then raise exception 'Destination square is occupied.'; end if;

  v_red := v_turn = 'r';
  v_king := v_piece = upper(v_piece);
  v_r := p_from / 8; v_c := p_from % 8;
  v_tr := p_to / 8; v_tc := p_to % 8;
  if abs(v_tr-v_r) <> abs(v_tc-v_c) then raise exception 'Draughts pieces move diagonally.'; end if;
  if abs(v_tr-v_r) not in (1,2) then raise exception 'Move one square, or jump one opposing piece.'; end if;
  if not v_king and ((v_red and v_tr >= v_r) or ((not v_red) and v_tr <= v_r)) then
    raise exception 'Men move forward only.';
  end if;
  if abs(v_tr-v_r)=2 then
    v_mid_r := (v_r+v_tr)/2; v_mid_c := (v_c+v_tc)/2; v_mid := v_mid_r*8+v_mid_c;
    if b[v_mid+1] is null or lower(b[v_mid+1]) = v_turn then raise exception 'A jump must capture an opposing piece.'; end if;
    v_capture := v_mid;
  else
    for idx in 0..63 loop
      if b[idx+1] is not null and lower(b[idx+1]) = v_turn then
        rr := idx/8; cc := idx%8; v_king := b[idx+1] = upper(b[idx+1]);
        for dr in -1..1 loop
          for dc in -1..1 loop
            if abs(dr)=1 and abs(dc)=1 then
              if v_king or (v_turn='r' and dr=-1) or (v_turn='b' and dr=1) then
                v_mid_r:=rr+dr;v_mid_c:=cc+dc;
                if v_mid_r between 0 and 7 and v_mid_c between 0 and 7 then
                  if b[v_mid_r*8+v_mid_c+1] is not null and lower(b[v_mid_r*8+v_mid_c+1])<>v_turn then
                    v_tr:=v_mid_r+dr;v_tc:=v_mid_c+dc;
                    if v_tr between 0 and 7 and v_tc between 0 and 7 and b[v_tr*8+v_tc+1] is null then v_must_capture:=true; end if;
                  end if;
                end if;
              end if;
            end if;
          end loop;
        end loop;
      end if;
    end loop;
    if v_must_capture then raise exception 'A capture is available and must be taken.'; end if;
  end if;

  -- Restore the requested destination after scanning the board for compulsory captures.
  v_tr := p_to / 8; v_tc := p_to % 8;
  b[p_from+1] := null;
  if v_capture is not null then b[v_capture+1] := null; end if;
  if v_piece='r' and v_tr=0 then v_piece:='R'; elsif v_piece='b' and v_tr=7 then v_piece:='B'; end if;
  b[p_to+1] := v_piece;

  if v_capture is not null and (v_king = true or v_piece = lower(v_piece)) then
    v_king := false;
    for dr in -1..1 loop
      for dc in -1..1 loop
        if abs(dr)=1 and abs(dc)=1 then
          if v_piece='R' or v_piece='B' or (v_piece='r' and dr=-1) or (v_piece='b' and dr=1) then
            rr:=v_tr+dr;cc:=v_tc+dc;
            if rr between 0 and 7 and cc between 0 and 7 then
              v_mid:=rr*8+cc;
              if b[v_mid+1] is not null and lower(b[v_mid+1])<>v_turn then
                rr:=rr+dr;cc:=cc+dc;
                if rr between 0 and 7 and cc between 0 and 7 and b[rr*8+cc+1] is null then v_king:=true; end if;
              end if;
            end if;
          end if;
        end if;
      end loop;
    end loop;
    if v_king then v_next_forced:=p_to; end if;
  end if;

  v_next_turn:=case when v_next_forced is not null then v_turn else case when v_turn='r' then 'b' else 'r' end end;
  v_moves:=v_moves||jsonb_build_array(jsonb_build_object('from',p_from,'to',p_to,'capture',v_capture));
  v_new_state:=jsonb_build_object('version',1,'board',to_jsonb(b),'turn',v_next_turn,'forced_from',v_next_forced,'moves',v_moves);
  update public.game_rooms set game_state=v_new_state,updated_at=now()
   where id=v_room.id;
  return query select v_room.room_code,v_new_state,v_room.status;
end;
$$;

revoke all on function public.submit_draughts_move(text,integer,integer) from public, anon;
grant execute on function public.submit_draughts_move(text,integer,integer) to authenticated;
