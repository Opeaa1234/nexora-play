# Nexora Play multiplayer staging release checklist

Use this checklist in a **separate Supabase staging project**. Do not run the migrations against production as part of this checklist. Use two test accounts in separate browser profiles so host and guest sessions cannot be confused.

## 1. Prepare staging

- [ ] Create or select a dedicated Supabase staging project.
- [ ] Configure the staging URL and publishable/anon key in the local test copy of `supabase-config.js`. Never put the service-role key in browser code or commit it.
- [ ] Create two test users and sign in from two separate browsers/profiles.
- [ ] Confirm the project has no production user data.
- [ ] Keep a record of the migration output and the project ref used.

## 2. Apply database SQL in order

Run these files from the repository root in Supabase SQL Editor, reviewing each result before continuing:

1. `supabase/game-rooms.sql`
2. `supabase/secure-room-joining.sql`
3. `supabase/live-chess-moves.sql`
4. `supabase/live-draughts-moves.sql`

Afterward verify:
- [ ] `game_rooms` has RLS enabled.
- [ ] Authenticated users do not have direct UPDATE permission on `game_rooms`.
- [ ] `join_game_room(text)` can be executed by authenticated users and rejects anonymous users.
- [ ] `submit_validated_chess_move(text,text,jsonb,jsonb,text)` is executable only by `service_role`.
- [ ] `submit_draughts_move(text,integer,integer)` is callable by authenticated users but rejects users who are not the host or guest.
- [ ] Enable `game_rooms` in the `supabase_realtime` publication (Database → Publications) so board and lobby subscriptions receive changes.

If any SQL fails, stop and resolve the error before testing the browser. Do not continue with a partially applied schema.

### Optional SQL Editor verification

Run this read-only query after all four SQL files finish. Review the rows rather than assuming that a successful migration guarantees the intended privileges:

```sql
select
  has_table_privilege('authenticated', 'public.game_rooms', 'SELECT') as authenticated_can_read_rooms,
  has_table_privilege('authenticated', 'public.game_rooms', 'INSERT') as authenticated_can_create_rooms,
  has_table_privilege('authenticated', 'public.game_rooms', 'UPDATE') as authenticated_can_update_rooms,
  has_function_privilege('authenticated', 'public.join_game_room(text)', 'EXECUTE') as authenticated_can_join,
  has_function_privilege('anon', 'public.join_game_room(text)', 'EXECUTE') as anonymous_can_join,
  has_function_privilege('authenticated', 'public.submit_validated_chess_move(text,text,jsonb,jsonb,text)', 'EXECUTE') as authenticated_can_call_chess_rpc,
  has_function_privilege('service_role', 'public.submit_validated_chess_move(text,text,jsonb,jsonb,text)', 'EXECUTE') as service_role_can_call_chess_rpc,
  has_function_privilege('authenticated', 'public.submit_draughts_move(text,integer,integer)', 'EXECUTE') as authenticated_can_submit_draughts;
```

Expected results: room SELECT and INSERT are true; room UPDATE is false; authenticated join is true; anonymous join is false; authenticated direct Chess RPC is false; service-role Chess RPC is true; authenticated Draughts RPC is true. These grants do not replace the RPCs' in-function player, turn, room-status, and move validation.

Check row-level security and realtime publication membership separately:

```sql
select relrowsecurity
from pg_class
where oid = 'public.game_rooms'::regclass;

select pubname
from pg_publication_tables
where schemaname = 'public' and tablename = 'game_rooms';
```

Expected: `relrowsecurity` is true and `game_rooms` appears under the `supabase_realtime` publication. If a function is absent or the privilege query errors because the signature differs, stop and reconcile the applied schema with the checked-in SQL before proceeding.

## 3. Deploy the Chess Edge Function

You can deploy from a trusted local terminal, or use the guarded GitHub Actions workflow `.github/workflows/deploy-staging-chess.yml`:

**GitHub Actions setup (one-time):**
1. In the repository's Settings → Secrets and variables → Actions, add `SUPABASE_ACCESS_TOKEN` (a Supabase personal access token) and `SUPABASE_STAGING_PROJECT_REF` (the staging project's 20-character project ref). Never use production credentials for these secrets.
2. In Settings → Environments, create the `staging` environment and optionally require reviewer approval before deployments.
3. Open Actions → **Deploy Chess Edge Function to Supabase Staging** → Run workflow, selecting `redevelopment/phase-2-homepage`. The workflow refuses to run from other branches and fails early if either secret is missing. It now runs the repository static validator, type-checks the Edge Function, and executes Chess validation tests before it attempts deployment; any failed check blocks deployment.

**Local CLI alternative:**

```sh
supabase link --project-ref YOUR_STAGING_PROJECT_REF
supabase functions deploy submit-chess-move --project-ref YOUR_STAGING_PROJECT_REF
```

The workflow deploys only the Chess Edge Function; it does not apply SQL migrations. Apply and verify the SQL files manually in the order above before gameplay testing.

Confirm the function has the standard Supabase environment variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The service-role key must remain server-side. Review function logs after each negative test below.

## 4. Room lifecycle and permissions

- [ ] Account A creates a public Chess room; it appears in Account B's open-room list.
- [ ] Account A creates a public Draughts room; it appears in Account B's open-room list.
- [ ] Private rooms do not appear in the public list but can be joined with the correct code.
- [ ] Invalid and nonexistent codes show a useful error.
- [ ] A host cannot join their own room as a guest.
- [ ] Two accounts attempting to join the same waiting room concurrently result in only one guest.
- [ ] A third account cannot join a room that is already playing.
- [ ] Host can reopen their own waiting room; guests have a separate Join action.
- [ ] Unauthenticated users cannot create, join, or submit moves.
- [ ] A signed-in non-player cannot submit moves to another pair's room.
- [ ] Direct client UPDATE attempts on `game_rooms` are denied.

## 5. Chess gameplay

- [ ] White's legal opening move is accepted and visible to both browsers without manual refresh.
- [ ] Black can move only after White; wrong-turn and illegal moves are rejected.
- [ ] Illegal moves that leave the king in check are rejected.
- [ ] Promotion offers queen, rook, bishop, and knight; each choice persists correctly.
- [ ] Checkmate and draw states finish the room and remain finished after refresh.
- [ ] Replaying a stale move request or submitting two moves from the same old position does not overwrite the newer state.
- [ ] A non-player cannot invoke the Edge Function successfully.
- [ ] Simulate a temporary network failure; the page gives a recoverable error and the saved board remains authoritative.

## 6. Draughts gameplay

- [ ] Both players see the same initial board and correct turn ownership.
- [ ] Legal diagonal moves work; occupied squares, backward man moves, and illegal distances are rejected.
- [ ] A compulsory capture prevents an ordinary move.
- [ ] Multi-jump captures require continuing with the same piece and correctly finish the turn when no further jump exists.
- [ ] Men promote to kings on the final rank; kings can move/capture in both directions.
- [ ] Captures and board state synchronize across both browsers after refresh/reconnect.
- [ ] A player with no legal moves loses; the winner and finished status persist.
- [ ] Malformed saved board/history/turn values fail safely rather than resetting the board.
- [ ] A non-player and a player moving out of turn are rejected.

## 7. Reconnect, mobile, and regression

- [ ] Refresh both clients mid-game and confirm they restore the same saved position.
- [ ] Disconnect one client briefly, reconnect, and verify no duplicate or stale move is accepted.
- [ ] Test narrow mobile viewport and touch interaction for both boards and room forms.
- [ ] Check keyboard focus, visible status/error announcements, and reduced-motion preference.
- [ ] Re-run the repository checks and inspect Supabase logs for unexpected errors.

## 8. Release decision

Record the date, tester, staging project ref, pass/fail for every checkbox, and any bug with reproduction steps. **Do not merge or deploy to production until all critical security/gameplay checks pass and any failures are fixed.** A green static CI run is necessary but does not replace this staging test.

After staging sign-off, prepare a separate production change window, back up/confirm migration rollback strategy, apply the reviewed SQL in the documented order, deploy the Edge Function, and perform a short production smoke test.
