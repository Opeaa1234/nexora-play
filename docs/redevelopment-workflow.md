# Nexora Play redevelopment workflow and release ledger

This file is the continuity record for each redevelopment session. Update it whenever a meaningful change is proposed, committed, tested, deployed, rolled back, or blocked. The Git history remains the source of truth for code; this ledger is the current operational summary.

## Working agreement

For every work cycle:

1. Re-read this ledger, the open redevelopment PR, the current branch head, and the latest CI result before changing files.
2. Inspect the affected code and its callers first. Prefer small, reviewable changes over broad rewrites.
3. Keep changes on `redevelopment/phase-2-homepage` and PR #2 unless the release plan is deliberately changed.
4. Run the relevant focused tests, then the full repository validation. Let GitHub Actions confirm the committed revision.
5. Update this ledger with the change, commit SHA, validation evidence, new risks, and next action. Update the PR description when the release state materially changes.
6. Keep the state labels honest: **PASS** means a check actually ran and passed; **NOT TESTED** means it has not been verified; **BLOCKED** means a dependency or approval is missing.
7. Do not call the product production-ready based only on static validation. Browser behavior, real authentication, realtime delivery, and multiplayer flows require environment-backed tests.
8. Do not apply SQL, change privileges, deploy functions, alter Auth settings, or modify live data without separate explicit production approval and a reviewed rollout plan.

## Current release ledger — 2026-10-28

### Repository and automation

- **PASS** — Work branch: `redevelopment/phase-2-homepage`.
- **PASS** — Open draft PR: [#2](https://github.com/Opeaa1234/nexora-play/pull/2).
- **PASS** — Latest recorded commit: `7b768f5999355aa39147e3eed22cdc88c1176c60` (`Document staging blocker and Supabase advisor findings`).
- **PASS** — Latest recorded validation run: [GitHub Actions 40749633520](https://github.com/Opeaa1234/nexora-play/actions/runs/40749633520).
- **NOT TESTED** — Full browser end-to-end tests against a separate staging backend.
- **NOT TESTED** — Live multiplayer smoke tests after a coordinated database/function/frontend release.

### Release blockers

- **BLOCKED** — No separate Supabase staging project or development branch was available during the last read-only review. Do not point staging secrets or deployments at the live project.
- **BLOCKED** — The staging workflow needs staging-only `SUPABASE_ACCESS_TOKEN` and `SUPABASE_STAGING_PROJECT_REF` secrets configured in GitHub's `staging` environment.
- **BLOCKED** — SQL setup and the Chess Edge Function are not deployed/verified together in staging. The deployment workflow intentionally deploys only the Edge Function and does not apply SQL.
- **BLOCKED** — The live database still had the legacy authenticated `submit_chess_move(text,text)` routine and did not have the new validated Chess RPC or Draughts move RPC at the time of review.
- **OPEN SECURITY REVIEW** — `public.rls_auto_enable()` was reported executable by `anon` and `authenticated` while marked `SECURITY DEFINER`; inspect trigger dependencies before designing a least-privilege correction.
- **OPEN AUTH SETTING** — Supabase Auth leaked-password protection was reported disabled; review and test the setting before release.
- **OPEN PERFORMANCE REVIEW** — Recheck advisor findings for RLS policies that re-evaluate auth functions per row and the unused `game_rooms_host_idx`; only optimize after staging verification.

Details and coordinated production rollout safeguards: [Live Supabase rollout runbook](live-supabase-rollout.md).

## Release gates

Do not mark multiplayer release-ready until all applicable gates are evidenced:

- [ ] A separate staging project is confirmed and its ref is verified not to be the production ref.
- [ ] Staging credentials are stored only in the GitHub `staging` environment.
- [ ] SQL is reconciled against the actual staging schema and applied in the intended order.
- [ ] The Chess Edge Function deploys successfully to staging and its required secrets are present.
- [ ] Chess legal, illegal, wrong-turn, stale-state, and non-player submissions are tested.
- [ ] Draughts legal, illegal, forced-capture, multi-jump, promotion, wrong-turn, and non-player cases are tested.
- [ ] Room creation/joining, realtime updates, refresh/reconnect, and mobile layout are tested with two authenticated users.
- [ ] RLS and RPC privilege probes match the expected least-privilege results.
- [ ] Existing player profiles, scores, and room data are verified unchanged.
- [ ] Production backup/export is recoverable, a maintenance window is agreed, rollback steps are ready, and production changes are explicitly approved.
- [ ] The production frontend, SQL, and function changes are coordinated; no insecure legacy move RPC is left as a long-term workaround.
- [ ] Post-release smoke tests and advisor review are recorded.

## Session handoff template

Append a dated entry below after each meaningful work cycle:

```md
### YYYY-MM-DD — short task description
- Change: ...
- Commit: ...
- Checks run: ... (include links/results)
- State: PASS / NOT TESTED / BLOCKED
- Risks or blockers added/cleared: ...
- Next action: ...
```

## Session history

### 2026-10-28 — continuity and release-gate record
- Change: created this tracked workflow/ledger so work sessions share a durable checklist and truthful release state.
- Commit: recorded by the GitHub commit history for this file.
- Checks: the existing CI result above applies to the preceding code revision; this documentation-only change must still pass the next Actions run.
- State: repository validation previously passed; this new documentation commit's CI is **NOT YET VERIFIED** until its run completes.
- Risks/blockers: staging infrastructure and the coordinated Supabase rollout remain blocked; no production changes authorized or performed.
- Next action: verify CI on the new commit, then continue targeted source review and resolve staging prerequisites before any environment deployment.
