# Deploying Nexora Play's live chess validator

This change keeps live chess moves on the server-validated path. Do not enable it on the live project until the migration and Edge Function have both been reviewed and tested in a non-production Supabase project.

## Files

- `supabase/functions/submit-chess-move/index.ts`: authenticates the caller, checks room membership and whose turn it is, replays saved UCI moves with `chess.js`, rejects illegal moves, and submits a compare-and-swap update.
- `supabase/live-chess-moves.sql`: removes the old client-callable RPC and installs a service-role-only RPC. The RPC locks the room and rejects stale histories so simultaneous requests cannot overwrite one another.
- `multiplayer-chess.html`: sends moves through the Edge Function rather than calling the database RPC directly.

## Required deployment order

1. Test in a separate Supabase project with test accounts and rooms.
2. Deploy the Edge Function from the repository root with the Supabase CLI:
   `supabase functions deploy submit-chess-move`
3. In the same test project, apply `supabase/live-chess-moves.sql` after `supabase/game-rooms.sql` and `supabase/secure-room-joining.sql`.
4. Verify the Edge Function has its standard Supabase environment values available: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Do not place the service-role key in browser code or commit it to the repository.
5. Test the cases below before deploying the website or applying the migration to production.

The SQL migration intentionally revokes the old `submit_chess_move(text,text)` function and grants execution of the new RPC only to `service_role`. If the Edge Function is not deployed, live chess move submission will fail safely rather than fall back to client-trusted moves.

## Test checklist

- Valid opening moves from White and Black are accepted.
- Illegal moves, moves that leave the king in check, and invalid promotions are rejected.
- A non-player cannot submit moves.
- A player cannot move out of turn.
- A player cannot submit moves after checkmate, stalemate, or a draw.
- Concurrent submissions using the same prior position result in at most one accepted move.
- A checkmate/draw persists `status = finished` and a result in `game_state`.
- The old RPC is not executable by `anon` or `authenticated`.
- Existing rooms with move histories can be replayed successfully.

## Important limitation

This implementation has not been deployed to Supabase or tested against a live database in this repository workflow. Treat it as a proposed implementation until the migration and Edge Function pass the test checklist in a staging project. Tournament readiness still requires broader authorization, abuse, reconnect, and gameplay testing.
