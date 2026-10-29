# Nexora Play live Supabase rollout runbook

Continuity and per-session release gates are tracked in [the redevelopment workflow and release ledger](redevelopment-workflow.md). Update that ledger whenever release state or blockers change.

This is a **production change plan**, not permission to run it automatically. The live project contains player profiles, scores, and game rooms. Preserve those records; do not create a replacement project or blindly replay every SQL file.

## What the read-only review found

At the time of review, the live project has the `game_rooms` table and existing player data. Its public routines include the legacy `submit_chess_move(text,text)`, `join_game_room(text)`, and `rls_auto_enable()`; the newer `submit_validated_chess_move(...)` and `submit_draughts_move(...)` routines were not present. No Chess Edge Function was deployed. Direct authenticated UPDATE permission on `game_rooms` was denied, and anonymous execution of `join_game_room(text)` was denied.

Recheck these facts immediately before a rollout; live state can change. The read-only check does not prove every policy or trigger is correct.

## Before changing production

- [ ] Schedule a short maintenance window for multiplayer moves. Replacing the legacy Chess RPC will interrupt moves from the old client until the new frontend is live.
- [ ] Take and verify a recoverable database backup/export using your normal Supabase process.
- [ ] Record the live project ref and confirm it deliberately; never put a service-role key in browser code or GitHub source.
- [ ] Capture the current definitions and execute privileges of the relevant functions, the RLS state/policies for `game_rooms`, and the realtime publication membership.
- [ ] Review any existing event trigger that calls `rls_auto_enable()` before changing its privileges or definition.
- [ ] Keep the current website and database available for rollback; document how to restore the prior frontend and database function definitions.

## Coordinated rollout order

Do not run all four SQL files indiscriminately on production. In particular, `game-rooms.sql` and `secure-room-joining.sql` are foundational setup files; reconcile their intended effects with the existing live schema first.

1. **Deploy the Chess Edge Function first**, using a reviewed, explicitly authorized deployment path. Do not route the live frontend to it yet. This prepares the server endpoint but it cannot save moves until the restricted database RPC exists.
2. **Apply and review `supabase/live-chess-moves.sql`** during the maintenance window. This drops the legacy client-callable Chess RPC and creates `submit_validated_chess_move(...)` for `service_role` only. Treat this as a breaking security change for the old frontend: moves through the old RPC will stop working.
3. **Apply and review `supabase/live-draughts-moves.sql`** before publishing the frontend that calls `submit_draughts_move(...)`. Verify it does not overwrite existing game state or unexpectedly change any existing room.
4. **If adopting room-join throttling, review and apply `supabase/room-join-rate-limit.sql` only after it has passed isolated staging.** This migration drops and recreates `join_game_room(text)` with a changed return shape. First compare it with the actual live function definition and dependencies; do not run it blindly. Apply it in the same maintenance window as the matching `rooms.html` update, and verify the counter table's RLS/privileges plus valid joins, rejected attempts, concurrent joins, and retry-after-window behavior.
5. **Publish the reviewed frontend commit** that sends Chess moves through `functions.invoke('submit-chess-move', ...)`, Draughts moves through the authenticated Draughts RPC, and handles the rate-limited join RPC response if that migration is adopted.
6. Run the smoke tests below before announcing multiplayer as available. If a step fails, stop and use the documented rollback plan rather than continuing with a partially configured release.

This ordering minimizes risk but does not make the database and static-site deployment atomic. Expect a short multiplayer interruption between retiring the legacy Chess RPC and the new frontend being available. If that interruption is unacceptable, design and review a compatibility/maintenance strategy before proceeding; do not leave the insecure RPC callable as a long-term workaround.

## Post-change verification

Run these read-only privilege checks in Supabase SQL Editor after the SQL is applied:

```sql
select
  has_table_privilege('authenticated', 'public.game_rooms', 'UPDATE') as authenticated_can_update_rooms,
  has_function_privilege('anon', 'public.join_game_room(text)', 'EXECUTE') as anonymous_can_join,
  has_function_privilege('authenticated', 'public.submit_validated_chess_move(text,text,jsonb,jsonb,text)', 'EXECUTE') as authenticated_can_call_chess_rpc,
  has_function_privilege('service_role', 'public.submit_validated_chess_move(text,text,jsonb,jsonb,text)', 'EXECUTE') as service_role_can_call_chess_rpc,
  has_function_privilege('authenticated', 'public.submit_draughts_move(text,integer,integer)', 'EXECUTE') as authenticated_can_submit_draughts;
```

Expected: `authenticated_can_update_rooms = false`, `anonymous_can_join = false`, `authenticated_can_call_chess_rpc = false`, `service_role_can_call_chess_rpc = true`, and `authenticated_can_submit_draughts = true`. These grants do not replace the functions' own authorization and validation.

- [ ] Host and guest can create/join rooms and both see state updates.
- [ ] A legal Chess move is saved; illegal, wrong-turn, stale, and non-player submissions are rejected.
- [ ] A legal Draughts move is saved; illegal, wrong-turn, and non-player submissions are rejected.
- [ ] A direct client UPDATE to `game_rooms` fails.
- [ ] Reconnect/refresh preserves saved board state; no active room silently resets.
- [ ] Review Edge Function logs and browser errors; check mobile layout and accessibility.
- [ ] Verify existing player profiles and best scores remain present and unchanged.

## Separate staging deployment

The GitHub Actions workflow `.github/workflows/deploy-staging-chess.yml` is intentionally restricted to the `staging` environment and a staging project ref. It deploys the Chess Edge Function only and does **not** apply SQL. Never repurpose its staging secret as a production credential. Production deployment requires a separately reviewed, explicit action and production-specific safeguards.

## Additional read-only blockers recorded on 2026-10-28

- The connected Supabase account listed only the existing live project; no separate staging project or Supabase development branches were available at review time. No Edge Functions were deployed. Do not run the staging workflow until a genuinely separate staging project is provisioned and its credentials are stored in the GitHub `staging` environment. Creating a project/branch may incur cost and needs a deliberate choice.
- Supabase security advisors reported that `public.rls_auto_enable()` is executable by both `anon` and `authenticated` while marked `SECURITY DEFINER`. Inspect its definition and any event trigger that depends on it, then prepare and test a least-privilege fix in staging. Do not blindly revoke privileges or alter the trigger in production.
- The legacy `public.submit_chess_move(text,text)` is executable by `authenticated` and does not perform full legal chess move validation. This is a release-blocking concern for multiplayer integrity; retire it only as part of the coordinated rollout above, not as an isolated production change.
- Supabase Auth's leaked-password protection was reported disabled. Review the Auth password-security setting and enable it through a separately reviewed change, accounting for the user experience.
- Performance advisors also noted RLS policies on `player_profiles` and `player_best_scores` that re-evaluate auth functions per row, plus an unused `game_rooms_host_idx`. These are optimization findings, not a reason to make untested production changes; validate any policy/index changes against actual query patterns in staging first.

These are advisor findings from a read-only check, not proof of exploitation. Re-run the advisors immediately before release and record which findings were resolved, accepted, or remain open.

