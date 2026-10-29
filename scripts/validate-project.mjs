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

const accountHtml = pages.get("account.html")?.source ?? "";
if (!accountHtml.includes("resetPasswordForEmail(email")) fail("Account page must offer a Supabase password-recovery flow");
if (!accountHtml.includes("event==='PASSWORD_RECOVERY'")) fail("Account page must recognize Supabase password-recovery callbacks");
if (!accountHtml.includes("let sessionRenderVersion=0;") || !accountHtml.includes("const renderVersion=++sessionRenderVersion;")) fail("Account profile rendering must version session changes so stale async reads cannot restore a signed-out or previous user session");
if (!accountHtml.includes("if(renderVersion!==sessionRenderVersion)return;")) fail("Account profile rendering must discard results from stale profile reads and inserts after an auth transition");
if (!accountHtml.includes("await loadPersonalBests(session.user.id,renderVersion);") || !/async function loadPersonalBests\(userId,renderVersion\)[\s\S]*?if\(renderVersion!==sessionRenderVersion\)return;/.test(accountHtml)) fail("Account personal-best requests must discard stale responses after an auth transition");
if (!accountHtml.includes("if(event==='SIGNED_IN'||event==='SIGNED_OUT'){setTimeout(()=>{void showSession(session)},0)}")) fail("Account page must defer session rendering outside the auth callback and avoid rerendering on initial-session/token-refresh events");
if (accountHtml.includes("showSession(session)});")) fail("Account page must not synchronously load profiles inside every Supabase auth-state callback");
if (!accountHtml.includes("new URLSearchParams(window.location.hash.slice(1)).get('type')==='recovery'")) fail("Account page must handle recovery links on initial load even if the auth event arrives early");
if (!accountHtml.includes('supabase.auth.updateUser({password})')) fail("Account page must let players set a new password from the recovery callback");
if (!accountHtml.includes("mode==='recovery'")) fail("Account form must provide a distinct password-recovery submission mode");
if (!accountHtml.includes('id="resetPasswordBtn"')) fail("Account page must provide a visible forgot-password control");
if (!accountHtml.includes("redirectTo:'https://opeaa1234.github.io/nexora-play/account.html'")) fail("Password recovery must return players to the account page");
if (!accountHtml.includes("if(u.protocol!=='https:')")) fail("Profile avatar URLs must use HTTPS");
if (!accountHtml.includes("loginTab.setAttribute('aria-pressed',String(mode==='login'))")) fail("Account mode buttons must expose their selected state accessibly");

const draughtsSql = await readFile(path.join(root, "supabase/live-draughts-moves.sql"), "utf8").catch(() => "");
if (!draughtsSql.includes("if v_room.game_state is null or not (v_room.game_state ? 'board') then")) fail("Draughts move RPC must reject missing saved board rather than reinitialize it during a move");
if (!/if jsonb_array_length\(v_board\) <> 64 then[\s\S]*?end if;\s*for idx in 0\.\.63 loop/i.test(draughtsSql)) fail("Draughts SQL must terminate the board-length guard before iterating squares");
if (!draughtsSql.includes("v_room.game_type is distinct from 'draughts'")) fail("Draughts RPC must reject null or incorrect room types");
if (!draughtsSql.includes("v_room.status is distinct from 'playing'")) fail("Draughts RPC must reject null or non-playing room status");
if (!/if jsonb_typeof\(v_board\) is distinct from 'array' then[\s\S]*?if jsonb_array_length\(v_board\) <> 64 then/i.test(draughtsSql)) fail("Draughts RPC must type-check saved boards before measuring their length");
if (!draughtsSql.includes("if v_piece not in ('r','b','R','B')")) fail("Draughts move RPC must reject unknown saved board pieces");
if (!draughtsSql.includes("v_turn is distinct from 'r' and v_turn is distinct from 'b'")) fail("Draughts move RPC must reject missing, null, or invalid saved turns");
if (!draughtsSql.includes("Saved multi-jump state has no available continuation.")) fail("Draughts RPC must reject stale forced multi-jump state instead of allowing a normal move");
if (!draughtsSql.includes("jsonb_typeof(v_moves) is distinct from 'array'")) fail("Draughts move RPC must reject malformed saved move history");
if (!draughtsSql.includes("if not (v_room.game_state ? 'moves') then")) fail("Draughts move RPC must reject missing saved move history instead of silently replacing it with an empty array");
if (!draughtsSql.includes("if p_room_code is null or p_room_code !~ '^[A-Za-z0-9]{6}$' then")) fail("Draughts move RPC must validate room-code input");
if (!draughtsSql.includes("if p_from is null or p_to is null")) fail("Draughts move RPC must reject null board-square inputs");
if ((draughtsSql.match(/create or replace function public\.submit_draughts_move\(/g) ?? []).length !== 1) fail("Draughts SQL migration must contain exactly one move RPC definition");
if (!draughtsSql.trimEnd().endsWith("grant execute on function public.submit_draughts_move(text,integer,integer) to authenticated;")) fail("Draughts SQL migration has unexpected trailing content");

const chessHtml = pages.get("multiplayer-chess.html")?.source ?? "";
const chessSql = await readFile(path.join(root, "supabase/live-chess-moves.sql"), "utf8").catch(() => "");
const chessFunction = await readFile(path.join(root, "supabase/functions/submit-chess-move/index.ts"), "utf8").catch(() => "");
const edge = await readFile(path.join(root, "supabase/functions/submit-chess-move/index.ts"), "utf8").catch(() => "");
const validation = await readFile(path.join(root, "supabase/functions/submit-chess-move/validation.ts"), "utf8").catch(() => "");
if (!chessHtml.includes("functions.invoke('submit-chess-move'")) fail("multiplayer-chess.html must submit moves through the submit-chess-move Edge Function");
if (!chessHtml.includes("async function explainMoveError(error)")) fail("Chess UI must surface actionable server-side move validation errors");
if (!chessHtml.includes("Room contains a malformed move history. The board was not reset.") || !chessHtml.includes("played.from+played.to+(played.promotion||'')!==m")) fail("Chess client must reject malformed and non-canonical saved move-history entries before rendering");
if (!chessHtml.includes("This room is active but its saved Chess move history is missing or malformed.")) fail("Live Chess must not silently reset an active room with missing saved move history");
if (!chessHtml.includes('role="status" aria-live="polite"')) fail("Chess UI must announce changing turn and match status to screen readers");
if (!chessHtml.includes("p.color==='w'?'white ':'black '")) fail("Chess squares must announce piece color and type to screen readers");
if (chessHtml.includes("rpc('submit_chess_move'")) fail("multiplayer-chess.html still calls the retired client-side chess RPC");
if (!validation.includes('npm:chess.js@1.4.0')) fail("Chess validation module must use chess.js to validate moves");
if (!validation.includes("It is not your turn.")) fail("Chess validation module must enforce turn order");
if (!edge.includes("auth.getUser()")) fail("Chess Edge Function must authenticate the caller");
if (!edge.includes("body === null || typeof body !== \"object\" || Array.isArray(body)")) fail("Chess Edge Function must reject non-object JSON request bodies");
if (!edge.includes("Could not verify your session right now. Try again.")) fail("Chess Edge Function must handle thrown authentication-service failures");
if (!edge.includes("Could not reach the chess room service. Try again.")) fail("Chess Edge Function must handle thrown room-query failures");
if (!edge.includes("Could not reach the chess save service. Refresh and check the game state.")) fail("Chess Edge Function must handle thrown move-save failures");
if (!edge.includes("submit_validated_chess_move")) fail("Chess Edge Function must persist through the restricted atomic RPC");
if (!chessSql.includes("grant execute on function public.submit_validated_chess_move") || !chessSql.includes("to service_role")) fail("Chess move RPC must be restricted to service_role");
if (!chessSql.includes("from public, anon, authenticated")) fail("Chess move RPC must revoke client execution privileges");
if (chessSql.includes("create or replace function public.submit_chess_move")) fail("Retired client-callable chess RPC must not be recreated");


const draughtsHtml = pages.get("multiplayer-draughts.html")?.source ?? "";
if (!draughtsHtml.includes(".sq:focus-visible")) fail("Live Draughts board must show a visible keyboard focus indicator");
if (!draughtsHtml.includes("const square=String.fromCharCode(97+i%8)+(8-Math.floor(i/8))")) fail("Live Draughts squares must use standard coordinates in accessible labels");
if (!draughtsHtml.includes("p===p.toUpperCase()?'king':'man'")) fail("Live Draughts square labels must announce piece type");
if (!draughtsHtml.includes('role="status" aria-live="polite"')) fail("Live Draughts must announce changing turn and match status to screen readers");
if (!draughtsHtml.includes("This room is active but its saved Draughts board is missing.")) fail("Live Draughts must not silently reset an active room with missing saved board state");
if (!draughtsHtml.includes("else{throw Error('Saved Draughts board is missing. The board was not reset.');}")) fail("Live Draughts must reject missing board state in waiting rooms too, rather than displaying a reconstructed board");
if (draughtsHtml.includes("const pos=state||initialBoard()")) fail("Live Draughts renderer must never substitute a fresh board when saved state is unavailable");
if (!draughtsHtml.includes("if(!state){el.innerHTML='<p class=\"status\">Waiting for verified saved board state…</p>'")) fail("Live Draughts must show an explicit unavailable state instead of an unverified board");
if (!draughtsHtml.includes("Saved Draughts board is malformed.")) fail("Live Draughts must reject malformed saved board data before rendering");
if (!draughtsHtml.includes("Saved Draughts turn is malformed.")) fail("Live Draughts must reject malformed saved turn data");
if (!draughtsHtml.includes("Saved Draughts continuation square is malformed.")) fail("Live Draughts must reject malformed multi-jump continuation state");
if (!draughtsHtml.includes("if(!Array.isArray(saved.moves))throw Error('Saved Draughts move history is missing or malformed. The board was not reset.')")) fail("Live Draughts must reject missing saved move history instead of defaulting it to an empty list");
if (!draughtsHtml.includes("syncVersion=0") || !draughtsHtml.includes("if(request!==syncVersion)return")) fail("Live Draughts refreshes must ignore stale overlapping room reads");
if (!chessHtml.includes("syncVersion=0") || !chessHtml.includes("if(request!==syncVersion)return")) fail("Live Chess refreshes must ignore stale overlapping room reads");

const roomsHtml = pages.get("rooms.html")?.source ?? "";
if (!roomsHtml.includes("data-open=") || !roomsHtml.includes("data-join=")) fail("Open rooms list must provide separate host-open and guest-join actions");
if (!roomsHtml.includes(".or('is_public.eq.true,host_id.eq.'+user.id)")) fail("Room list must include the signed-in host's own private waiting rooms as well as public rooms");
if (!roomsHtml.includes("multiplayer-draughts.html") || !roomsHtml.includes("multiplayer-chess.html")) fail("Room actions must route to the selected multiplayer game");
if (!roomsHtml.includes("function initialDraughtsState()")) fail("New Draughts rooms must persist a valid initial board before the guest joins");
if (!roomsHtml.includes("sessionVersion=0") || !roomsHtml.includes("if(version!==sessionVersion)return")) fail("Room lobby must invalidate stale asynchronous session and room-list work after auth transitions");
if (!roomsHtml.includes("async function loadRooms(version=sessionVersion)") || !roomsHtml.includes("if(version!==sessionVersion||user?.id!==requestedUser.id)return")) fail("Room list responses must not overwrite the lobby after sign-out or account switching");
if (!roomsHtml.includes("event==='SIGNED_IN'||event==='SIGNED_OUT'") || !roomsHtml.includes("supabase.removeChannel(channel);channel=null")) fail("Room lobby must react to session changes safely and release its realtime subscription on sign-out");
if (!roomsHtml.includes("const version=++sessionVersion;setTimeout(()=>{void sessionCheck(session,version)")) fail("Room lobby must invalidate stale requests immediately before deferring auth-event handling");
if (!roomsHtml.includes("if(version===sessionVersion)void loadRooms(version)")) fail("Room realtime callbacks must be ignored after their session subscription becomes stale");
if (!roomsHtml.includes("gameType==='draughts'?initialDraughtsState():{version:1,stage:'waiting',moves:[]}")) fail("New rooms must initialize Draughts boards and Chess move histories before becoming active");
if (roomsHtml.includes("Room hosting and joining will be enabled after the database setup is completed.")) fail("Room lobby must not display a stale disabled-feature message after setup");

const deployWorkflow = await readFile(path.join(root, ".github/workflows/deploy-staging-chess.yml"), "utf8").catch(() => "");
if (!deployWorkflow.includes("if: github.ref == 'refs/heads/redevelopment/phase-2-homepage'")) fail("Chess Edge Function deployment must remain restricted to the reviewed redevelopment branch");
if (!deployWorkflow.includes("environment: staging")) fail("Chess Edge Function deployment must use the staging environment");
if (!deployWorkflow.includes("SUPABASE_STAGING_PROJECT_REF")) fail("Chess Edge Function deployment must use a staging-specific project ref");
if (!deployWorkflow.includes('if [[ "$SUPABASE_STAGING_PROJECT_REF" == "umcdpqnewicffvvyajef" ]]')) fail("Staging deployment must explicitly refuse the known production Supabase project ref");
if (!deployWorkflow.includes("The staging project ref matches Nexora Play production. Refusing deployment.")) fail("Staging deployment must fail with an explicit error if configured with the production project ref");
if (/supabase\s+db\s+push|supabase\s+migration\s+up/i.test(deployWorkflow)) fail("Staging Edge Function workflow must not apply database migrations automatically");
const rolloutDoc = await readFile(path.join(root, "docs/live-supabase-rollout.md"), "utf8").catch(() => "");
if (!rolloutDoc.includes("not permission to run it automatically") || !rolloutDoc.includes("maintenance window") || !rolloutDoc.includes("does **not** apply SQL")) fail("Live Supabase rollout guide must preserve explicit production approval, maintenance-window, and SQL-separation safeguards");

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
if (!joinSql.includes("v_room.status is distinct from 'waiting'")) fail("Room-join RPC must reject null or non-waiting room status");
if (!joinSql.includes("grant execute on function public.join_game_room(text) to authenticated")) fail("Room-join RPC must be executable by signed-in players");
if (!draughtsSql.includes("Saved Draughts board is missing.")) fail("Draughts RPC must reject a missing saved board instead of initializing a fresh board in a playing room");
if (draughtsSql.includes("Only a new room may initialize a board.")) fail("Draughts move RPC must not initialize board state during a move submission");
if (!draughtsSql.includes("v_user <> v_room.host_id and v_user <> v_room.guest_id")) fail("Draughts move RPC must reject non-player accounts");
if (!draughtsSql.includes("security definer\nset search_path = ''")) fail("Draughts move RPC must be SECURITY DEFINER with an empty search_path");
if (!draughtsSql.includes("revoke all on function public.submit_draughts_move(text,integer,integer) from public, anon")) fail("Draughts move RPC must revoke execution from public and anonymous users");
if (!draughtsSql.includes("grant execute on function public.submit_draughts_move(text,integer,integer) to authenticated")) fail("Draughts move RPC must explicitly grant execution to authenticated players");
if (!draughtsSql.includes("if (v_turn = 'r' and v_user <> v_room.host_id) or (v_turn = 'b' and v_user <> v_room.guest_id) then")) fail("Draughts move RPC must bind turns to the host and guest roles");

if (!draughtsSql.includes("It is not your turn.")) fail("Draughts move RPC must enforce turn ownership");
if (!draughtsSql.includes("Saved Draughts continuation square does not contain the current player piece.")) fail("Draughts RPC must reject stale or opponent-owned multi-jump continuation squares");
if (!draughtsSql.includes("v_turn := v_room.game_state->>'turn';") || !draughtsSql.includes("v_turn is distinct from 'r' and v_turn is distinct from 'b'")) fail("Draughts RPC must reject missing or null saved turn state instead of defaulting to Red");
if (!chessSql.includes("v_current_moves is distinct from p_expected_moves")) fail("Chess move RPC must compare-and-swap against the current move history");
if (!/v_current_moves := v_room\.game_state->'moves';[\s\S]*?jsonb_typeof\(v_current_moves\) is distinct from 'array'[\s\S]*?Saved chess move history is missing or malformed\./i.test(chessSql)) fail("Chess move RPC must reject missing or malformed saved history instead of resetting the position");
if (!chessFunction.includes("const savedMoves = room.game_state?.moves;")) fail("Chess Edge Function must read saved move history explicitly");
if (!/if \(!Array\.isArray\(savedMoves\)\)[\s\S]*?Saved chess move history is missing or malformed/i.test(chessFunction)) fail("Chess Edge Function must reject missing or malformed saved history instead of resetting the position");
if (!chessSql.includes("v_room.game_type is distinct from 'chess'")) fail("Chess RPC must reject null or incorrect room types");
if (!chessSql.includes("v_room.status is distinct from 'playing'")) fail("Chess RPC must reject null or non-playing room status");

if (errors.length) {
  console.error("Nexora Play validation failed:");
  for (const error of errors) console.error(` - ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Nexora Play validation passed: ${htmlFiles.length} HTML pages, local references, IDs, and chess/Draughts server-validation guardrails checked.`);
}
