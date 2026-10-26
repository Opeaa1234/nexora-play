import { createClient } from "npm:@supabase/supabase-js@2";
import { Chess } from "npm:chess.js@1.4.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function reply(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Use POST to submit a chess move." });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");
  if (!url || !anonKey || !serviceKey) {
    return reply(500, { error: "Chess move validation is not configured on the server." });
  }
  if (!authorization) return reply(401, { error: "Sign in before making a move." });

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return reply(401, { error: "Your session is invalid. Sign in again." });

  let body: { roomCode?: unknown; move?: unknown };
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: "Request body must be valid JSON." });
  }
  const roomCode = typeof body.roomCode === "string" ? body.roomCode.trim().toUpperCase() : "";
  const move = typeof body.move === "string" ? body.move.trim().toLowerCase() : "";
  if (!/^[A-Z0-9]{6}$/.test(roomCode)) return reply(400, { error: "Invalid room code." });
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) return reply(400, { error: "Invalid move format." });

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: room, error: roomError } = await admin
    .from("game_rooms")
    .select("id, room_code, host_id, guest_id, status, game_type, game_state")
    .eq("room_code", roomCode)
    .maybeSingle();
  if (roomError) return reply(500, { error: "Could not load the chess room." });
  if (!room) return reply(404, { error: "Room not found." });
  if (room.game_type !== "chess") return reply(400, { error: "This room is not a chess room." });
  if (room.status !== "playing" || !room.guest_id) return reply(409, { error: "This chess room is not currently playing." });
  if (authData.user.id !== room.host_id && authData.user.id !== room.guest_id) {
    return reply(403, { error: "You are not a player in this room." });
  }

  const moves = Array.isArray(room.game_state?.moves) ? room.game_state.moves : [];
  const game = new Chess();
  try {
    for (const raw of moves) {
      if (typeof raw !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(raw)) {
        return reply(409, { error: "The saved chess history is malformed. Ask the room host to report this room." });
      }
      const replayed = game.move({
        from: raw.slice(0, 2),
        to: raw.slice(2, 4),
        ...(raw[4] ? { promotion: raw[4] } : {}),
      });
      if (!replayed || replayed.from + replayed.to + (replayed.promotion || "") !== raw) {
        return reply(409, { error: "The saved chess history contains an illegal move." });
      }
    }
  } catch {
    return reply(409, { error: "The saved chess history cannot be replayed." });
  }
  if (game.isGameOver()) return reply(409, { error: "This chess game has already ended." });
  if ((game.turn() === "w" && authData.user.id !== room.host_id) || (game.turn() === "b" && authData.user.id !== room.guest_id)) {
    return reply(403, { error: "It is not your turn." });
  }

  const from = move.slice(0, 2);
  const to = move.slice(2, 4);
  let played;
  try {
    played = game.move({ from, to, ...(move[4] ? { promotion: move[4] } : {}) });
  } catch {
    return reply(400, { error: "That is not a legal chess move." });
  }
  if (!played || played.from + played.to + (played.promotion || "") !== move) {
    return reply(400, { error: "That is not a legal chess move. Include a promotion piece when required." });
  }

  const expectedMoves = moves;
  const nextMoves = [...moves, move];
  const ended = game.isGameOver();
  const result = game.isCheckmate() ? (game.turn() === "w" ? "0-1" : "1-0") : game.isDraw() ? "1/2-1/2" : null;
  const nextState = {
    version: 1,
    stage: ended ? "finished" : "playing",
    moves: nextMoves,
    result,
  };
  const { error: saveError } = await admin.rpc("submit_validated_chess_move", {
    p_room_code: roomCode,
    p_move: move,
    p_expected_moves: expectedMoves,
    p_next_state: nextState,
    p_next_status: ended ? "finished" : "playing",
  });
  if (saveError) {
    const conflict = /position changed/i.test(saveError.message || "");
    return reply(conflict ? 409 : 400, { error: conflict ? "The position changed. Refresh and try again." : saveError.message });
  }
  return reply(200, { ok: true, status: ended ? "finished" : "playing", result });
});
