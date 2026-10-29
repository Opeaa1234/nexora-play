# Live Supabase read-only review — 2026-10-28

This note records a read-only review of the live Nexora Play Supabase project. No SQL, privileges, Auth settings, Edge Functions, or live rows were changed.

## Project and integration status

- Live project ref: `umcdpqnewicffvvyajef` (eu-west-1), status `ACTIVE_HEALTHY`.
- The account currently exposes only this one Supabase project; no separate staging project or development branch was found.
- No Edge Functions are currently deployed to the live project.
- The database migration registry is empty. This does **not** establish that the schema is empty or that SQL was never applied; the owner applies SQL manually in the dashboard.
- Public tables observed: `player_profiles`, `player_best_scores`, and `game_rooms`; RLS is enabled on all three.
- `game_rooms` has four rows. Do not use destructive tests or reset it as part of integration work.

## Confirmed release risks

### Legacy Chess move RPC remains live

The live database contains `public.submit_chess_move(text, text)`, a `SECURITY DEFINER` routine executable by the `authenticated` role. It checks room membership, whose turn it is, and the move's coordinate-string format, but it appends the move without validating full Chess legality. A signed-in player may therefore bypass the new `chess.js` server validator if the client calls this legacy RPC directly.

The repository's replacement is `public.submit_validated_chess_move(text, text, jsonb, jsonb, text)`, restricted to `service_role`, with validation performed by `supabase/functions/submit-chess-move`. The replacement RPC is absent from the live database, and no Edge Function is deployed. This is a coordinated SQL/function/frontend rollout, not a safe one-file hotfix.

**Decision:** do not drop or revoke the legacy RPC in isolation: that could break the currently deployed client before the replacement path is deployed and verified. Before production release, arrange a controlled maintenance window, recoverable backup, reviewed SQL/function/frontend order, and post-release two-player smoke tests. Do not treat the existing state as production-ready for adversarial multiplayer Chess.

### SECURITY DEFINER RLS event-trigger helper

The advisor reports `public.rls_auto_enable()` as executable by `PUBLIC`, `anon`, and `authenticated`. Read-only inspection confirmed that this is an event-trigger function attached to the database event trigger `ensure_rls` for `ddl_command_end`, not an ordinary application RPC. This makes the generic advisor finding different from the legacy Chess RPC exposure. Its grants should still be reviewed for least privilege, but do not remove or change them without checking event-trigger ownership and behavior.

### Other advisor findings

- Supabase Auth leaked-password protection is disabled; enable only after reviewing the project Auth configuration and testing expected signup/password-change behavior.
- Several RLS policies re-evaluate auth functions per row. This is a performance optimization, not evidence of an authorization bypass.
- `game_rooms_host_idx` is currently reported unused. Do not drop it without workload evidence.

## Current checks and blockers

- GitHub Actions validation run [40752737640](https://github.com/Opeaa1234/nexora-play/actions/runs/40752737640) passed, including Edge Function type-check, Chess move-validation tests, and project/security guardrails.
- Static validation does not prove browser, auth, realtime, or multiplayer behavior against a real backend.
- Staging is blocked until a separate Supabase project or approved development branch is provisioned and its ref is verified not to be `umcdpqnewicffvvyajef`. Creating a separate project/branch may incur charges; no new environment was created.
- The staging-only GitHub environment still needs its own `SUPABASE_ACCESS_TOKEN` and `SUPABASE_STAGING_PROJECT_REF` secrets. Never use the live project ref as the staging secret.
- No production database, permission, Auth, deployment, or data changes were performed during this review.

## Next actions

1. Provision/confirm a separate staging backend and configure staging-only secrets.
2. Apply the reviewed SQL to staging in order, then deploy the Chess Edge Function to staging.
3. Exercise two authenticated players through room join, legal/illegal/wrong-turn Chess moves, stale state, malformed saved history, Draughts forced captures/multi-jumps/promotion, refresh/reconnect, and realtime delivery.
4. Re-run privilege probes and Supabase advisors; record exact results.
5. Only then prepare a production change plan that explicitly accounts for the legacy Chess RPC and old-client compatibility.
