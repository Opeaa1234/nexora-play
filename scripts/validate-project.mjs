import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const errors = [];
const htmlFiles = (await readdir(root)).filter((name) => name.endsWith(".html"));

function fail(message) { errors.push(message); }
function stripQueryHash(value) { return value.split(/[?#]/, 1)[0]; }

const pages = new Map();
for (const file of htmlFiles) {
  const source = await readFile(path.join(root, file), "utf8");
  const ids = [...source.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) fail(`${file}: duplicate id "${id}"`);
    seen.add(id);
  }
  pages.set(file, { source, ids: seen });
}

for (const [file, page] of pages) {
  const refs = [...page.source.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)];
  for (const match of refs) {
    const raw = match[1].trim();
    if (!raw || /^(?:[a-z]+:|\/\/|#|\{)/i.test(raw)) {
      if (raw.startsWith("#") && raw.length > 1 && !page.ids.has(decodeURIComponent(raw.slice(1)))) {
        fail(`${file}: missing in-page fragment "${raw}"`);
      }
      continue;
    }
    const localPath = stripQueryHash(raw);
    if (!localPath) continue;
    const resolved = path.resolve(root, path.dirname(file), decodeURIComponent(localPath));
    if (!resolved.startsWith(root + path.sep)) {
      fail(`${file}: reference escapes repository root: "${raw}"`);
      continue;
    }
    try {
      const info = await stat(resolved);
      if (!info.isFile()) fail(`${file}: reference is not a file: "${raw}"`);
      if (raw.includes("#") && path.extname(resolved) === ".html") {
        const fragment = decodeURIComponent(raw.split("#").slice(1).join("#"));
        if (fragment) {
          const target = pages.get(path.relative(root, resolved));
          if (target && !target.ids.has(fragment)) fail(`${file}: ${raw} points to missing fragment "${fragment}"`);
        }
      }
    } catch {
      fail(`${file}: missing local reference "${raw}"`);
    }
  }
}

const draughtsSql = await readFile(path.join(root, "supabase/live-draughts-moves.sql"), "utf8").catch(() => "");
if (!draughtsSql.includes("if not (v_room.game_state ? 'board') then")) fail("Draughts may initialize a board only when saved state has no board key");
if (!/if jsonb_typeof\(v_board\) is distinct from 'array' then[\s\S]*?if jsonb_array_length\(v_board\) <> 64 then/i.test(draughtsSql)) fail("Draughts RPC must type-check saved boards before measuring their length");
if (!draughtsSql.includes("Saved Draughts state has move history but no board.")) fail("Draughts RPC must reject move history that has lost its board");
if (!draughtsSql.includes("if v_piece not in ('r','b','R','B')")) fail("Draughts move RPC must reject unknown saved board pieces");
if (!draughtsSql.includes("if v_turn not in ('r','b')")) fail("Draughts move RPC must reject an invalid saved turn");
if (!draughtsSql.includes("jsonb_typeof(v_moves) is distinct from 'array'")) fail("Draughts move RPC must reject malformed saved move history");
if (!draughtsSql.includes("if p_room_code is null or p_room_code !~ '^[A-Za-z0-9]{6}$' then")) fail("Draughts move RPC must validate room-code input");
if (!draughtsSql.includes("if p_from is null or p_to is null")) fail("Draughts move RPC must reject null board-square inputs");
if ((draughtsSql.match(/create or replace function public\.submit_draughts_move\(/g) ?? []).length !== 1) fail("Draughts SQL migration must contain exactly one move RPC definition");
if (!draughtsSql.trimEnd().endsWith("grant execute on function public.submit_draughts_move(text,integer,integer) to authenticated;")) fail("Draughts SQL migration has unexpected trailing content");

const chessHtml = pages.get("multiplayer-chess.html")?.source ?? "";
const chessSql = await readFile(path.join(root, "supabase/live-chess-moves.sql"), "utf8").catch(() => "");
const edge = await readFile(path.join(root, "supabase/functions/submit-chess-move/index.ts"), "utf8").catch(() => "");
const validation = await readFile(path.join(root, "supabase/functions/submit-chess-move/validation.ts"), "utf8").catch(() => "");
if (!chessHtml.includes("functions.invoke('submit-chess-move'")) fail("multiplayer-chess.html must submit moves through the submit-chess-move Edge Function");
if (chessHtml.includes("rpc('submit_chess_move'")) fail("multiplayer-chess.html still calls the retired client-side chess RPC");
if (!validation.includes('npm:chess.js@1.4.0')) fail("Chess validation module must use chess.js to validate moves");
if (!validation.includes("It is not your turn.")) fail("Chess validation module must enforce turn order");
if (!edge.includes("auth.getUser()")) fail("Chess Edge Function must authenticate the caller");
if (!edge.includes("submit_validated_chess_move")) fail("Chess Edge Function must persist through the restricted atomic RPC");
if (!chessSql.includes("grant execute on function public.submit_validated_chess_move") || !chessSql.includes("to service_role")) fail("Chess move RPC must be restricted to service_role");
if (!chessSql.includes("from public, anon, authenticated")) fail("Chess move RPC must revoke client execution privileges");
if (chessSql.includes("create or replace function public.submit_chess_move")) fail("Retired client-callable chess RPC must not be recreated");


const roomSql = await readFile(path.join(root, "supabase/game-rooms.sql"), "utf8").catch(() => "");
const joinSql = await readFile(path.join(root, "supabase/secure-room-joining.sql"), "utf8").catch(() => "");
if (!roomSql.includes("alter table public.game_rooms enable row level security")) fail("Game rooms table must enable row-level security");
if (!roomSql.includes("host_id = (select auth.uid()) and guest_id is null and status = 'waiting'")) fail("Room creation policy must bind new rooms to the authenticated host");
if (!roomSql.includes("grant select, insert on public.game_rooms to authenticated")) fail("Room foundation must grant only client read and create permissions");
if (!roomSql.includes("revoke update on public.game_rooms from authenticated")) fail("Room foundation must revoke direct client updates by default");
if (/grant\s+[^;]*\bupdate\b[^;]*\bon\s+public\.game_rooms\s+to\s+authenticated/i.test(roomSql)) fail("Room foundation must not grant direct client updates");
if (/create\s+policy[^;]*on\s+public\.game_rooms\s+for\s+update/i.test(roomSql)) fail("Room foundation must not create direct room-update policies");
if (!joinSql.includes("revoke update on table public.game_rooms from authenticated")) fail("Clients must not directly update game room records after secure room joining is installed");
if (!joinSql.includes("security definer") || !joinSql.includes("set search_path = ''")) fail("Atomic room-join RPC must be SECURITY DEFINER with an empty search_path");
if (!/v_user_id\s+uuid\s*:=\s*auth\.uid\(\)/i.test(joinSql)) fail("Room-join RPC must require an authenticated caller");
if (!joinSql.includes("for update")) fail("Room-join RPC must lock the room row to prevent simultaneous joins");
if (!joinSql.includes("v_room.status <> 'waiting'")) fail("Room-join RPC must reject rooms that are no longer waiting");
if (!joinSql.includes("grant execute on function public.join_game_room(text) to authenticated")) fail("Room-join RPC must be executable by signed-in players");
if (!draughtsSql.includes("v_user <> v_room.host_id and v_user <> v_room.guest_id")) fail("Draughts move RPC must reject non-player accounts");
if (!draughtsSql.includes("It is not your turn.")) fail("Draughts move RPC must enforce turn ownership");
if (!chessSql.includes("v_current_moves is distinct from p_expected_moves")) fail("Chess move RPC must compare-and-swap against the current move history");

if (errors.length) {
  console.error("Nexora Play validation failed:");
  for (const error of errors) console.error(` - ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Nexora Play validation passed: ${htmlFiles.length} HTML pages, local references, IDs, and chess/Draughts server-validation guardrails checked.`);
}
