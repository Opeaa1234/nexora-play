import { createClient } from "npm:@supabase/supabase-js@2";
import { ChessMoveValidationError, validateAndApplyChessMove } from "./validation.ts";

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: "Request body must be valid JSON." });
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return reply(400, { error: "Request body must be a JSON object." });
  }
  const payload = body as { roomCode?: unknown; move?: unknown };
  const roomCode = typeof payload.roomCode === "string" ? payload.roomCode.trim().toUpperCase() : "";
  const move = typeof payload.move === "string" ? payload.move.trim().toLowerCase() : "";
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

  let validated;
  try {
    validated = validateAndApplyChessMove(
      room.game_state?.moves ?? [],
      move,
      authData.user.id === room.host_id ? "w" : "b",
    );
  } catch (error) {
    if (error instanceof ChessMoveValidationError) {
      return reply(error.status, { error: error.message });
    }
    return reply(400, { error: "The chess move could not be validated." });
  }

  const expectedMoves = Array.isArray(room.game_state?.moves) ? room.game_state.moves : [];
  const nextMoves = validated.nextMoves;
  const ended = validated.status === "finished";
  const result = validated.result;
  const nextState = {
    version: 1,
    stage: validated.status,
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
    return reply(conflict ? 409 : 500, { error: conflict ? "The position changed. Refresh and try again." : "The server could not save this move. Refresh and try again." });
  }
  return reply(200, { ok: true, status: ended ? "finished" : "playing", result });
});
