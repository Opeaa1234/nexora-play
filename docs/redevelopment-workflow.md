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
- **PASS** — Latest reviewed branch commit before this ledger entry: `7ab3e971bcd15357024ec277984f983b81544923` (`docs: record current live Supabase review and release risks`). The ledger update itself creates a new commit and triggers another validation run.
- **PASS** — Latest confirmed validation before this ledger entry: [GitHub Actions 40753423383](https://github.com/Opeaa1234/nexora-play/actions/runs/40753423383), successful for the live-review documentation commit `7ab3e971bcd15357024ec277984f983b81544923`.
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
- Commit: `51bd1eac7afcb5b8eb353fab09f523f4b5101098`; rollout runbook linked in `878ed25bcca9104571eb54caa3ba43576d9146c6`.
- Checks: existing CI passed on `7b768f5999355aa39147e3eed22cdc88c1176c60`; CI for the subsequent documentation commits was not verified in the previous session.
- State: **NOT YET VERIFIED** on the latest source revision until the Actions run confirms it.
- Risks/blockers: staging infrastructure and coordinated Supabase rollout remain blocked; no production changes authorized or performed.
- Next action: continue targeted source review, expand Chess move-rule coverage, and resolve staging prerequisites before any environment deployment.

### 2026-10-28 — expand Chess validator regression coverage
- Change: added regression tests for legal kingside castling and en-passant capture to ensure full-history replay accepts these special legal moves.
- Commit: `9952e658ac2d28e574355bc333bf9f51b90f728f`.
- Checks: [GitHub Actions run 40751028247](https://github.com/Opeaa1234/nexora-play/actions/runs/40751028247) **PASSED**, including Deno type-check, Chess move validation tests, and project/security guardrail validation.
- State: **PASS** for the tested source revision `9952e658ac2d28e574355bc333bf9f51b90f728f`. A subsequent documentation-only ledger commit `725cf68ea25f7d580d6e4e2d5f5634007d751548` is newer and still needs its own CI confirmation.
- Risks/blockers: staging infrastructure and live integration tests remain blocked; no production changes authorized or performed.
- Next action: verify CI for the newest branch head, then continue reviewing rule edge cases and staging prerequisites.

### 2026-10-28 — prevent staging deployment to production by misconfiguration
- Change: hardened `.github/workflows/deploy-staging-chess.yml` to fail if `SUPABASE_STAGING_PROJECT_REF` equals the known live project ref; added a validator guardrail requiring that explicit safety stop.
- Commits: workflow guard `e88555ae9eb3e9bdc4a7259cdf35140adde78aa8`; validator guardrail `859f4a0a3e948a8c10ab4f99432cc3f5f21f2138`.
- Checks: [GitHub Actions run 40751302183](https://github.com/Opeaa1234/nexora-play/actions/runs/40751302183) passed for the workflow/validator guardrail commits; [run 40751339844](https://github.com/Opeaa1234/nexora-play/actions/runs/40751339844) also passed for commit `8fa57c66a0d9869a5cc6a59d73e3987bc06c7626`, including Deno type-check, Chess regression tests, and project/security guardrail validation.
- State: **PASS** for the production-ref deployment safeguard and the workflow/validator source revision. This ledger update is documentation-only.
- Risks/blockers: no separate staging project is configured; this guard prevents one dangerous misconfiguration but does not provision staging or authorize deployment. No production database or deployment changes were made.
- Next action: provision or confirm a genuinely separate Supabase staging project, configure staging-only GitHub secrets, then validate the SQL/function/frontend integration there before preparing any separately approved production rollout.


### 2026-10-28 — reject Chess moves when saved history is missing

- Change: source review found that the Chess Edge Function and atomic SQL RPC both treated missing saved move history as an empty move list. On an active room with malformed state, that could allow a move to be validated from the starting position and overwrite the saved state. The Edge Function now returns HTTP 409 when saved history is not an array; the SQL RPC independently rejects a missing/non-array history before compare-and-swap.
- Commits: Edge Function `49e682afc2152a6d960cb065ecc8a01092926ef7`; SQL `e644d3e3271834c6caa4564c7abe3e2758d6f1ef`; validator regression guard `318f274f77e7d3a74955834c115eb064153fcb1d`.
- Checks: [GitHub Actions 40752071298](https://github.com/Opeaa1234/nexora-play/actions/runs/40752071298) passed for source commit `318f274f77e7d3a74955834c115eb064153fcb1d`; [GitHub Actions 40752137527](https://github.com/Opeaa1234/nexora-play/actions/runs/40752137527) passed for the latest branch head after the ledger update. Deno type-check, Chess validation tests, and project/security guardrails all passed.
- State: **PASS** for the latest branch head's static validation. Production database, deployment, and permissions were not changed; the SQL file is a reviewed source change only and still needs staging application/testing.
- Risks/blockers: staging project and staging-only GitHub secrets remain unavailable/unconfirmed; no production rollout is authorized.
- Next action: confirm CI for the latest commit, then continue targeted validation and resolve staging prerequisites before any deployment.


### 2026-10-28 — broaden malformed Chess history regression tests

- Change: expanded the saved-history regression test to reject `null`, `undefined`, objects, strings, and numeric values when attempting a legal opening move. This protects against accidentally treating malformed state as a fresh board.
- Commit: `40f8b2359a9ab511ea00608c58d7ee9d6271ed62`.
- Validation: [GitHub Actions 40752646971](https://github.com/Opeaa1234/nexora-play/actions/runs/40752646971) passed for the test commit.
- State: **PASS** for static validation and malformed-history regression coverage. Staging integration and production rollout remain blocked/not authorized; no live Supabase changes were made.
- Next action: continue targeted source review, then resolve separate staging project and staging-only secrets before integration testing.


### 2026-10-28 — current live Supabase review and release risk confirmation

- Change: added [live Supabase read-only review](live-supabase-read-only-review-2026-10-28.md) documenting the current project inventory, live routine state, advisor findings, and safe rollout sequencing.
- Commit: `7ab3e971bcd15357024ec277984f983b81544923`.
- Checks: [GitHub Actions run 40753423383](https://github.com/Opeaa1234/nexora-play/actions/runs/40753423383) passed, including Deno type-check, Chess validation tests, and project/security guardrails.
- Live findings: the legacy authenticated `submit_chess_move(text,text)` remains present and does not validate full Chess legality; the replacement service-role-only RPC is absent and no Edge Functions are deployed. The `rls_auto_enable()` advisor warning refers to an event-trigger function attached to `ensure_rls`, so it requires event-trigger-aware privilege review. RLS is enabled on the three observed public tables.
- State: **PASS** for static CI and read-only inspection; **BLOCKED** for full staging integration. No live SQL, privileges, Auth settings, deployments, or data were changed.
- Risks/blockers: only the live Supabase project is available, no development branches exist, and no staging-only GitHub secrets are configured. Do not disable the legacy Chess RPC in isolation because that could break the current client before the replacement is deployed.
- Next action: provision/confirm a separate staging backend, configure staging-only secrets, apply the reviewed SQL and deploy the Edge Function in staging, then run two-player Chess/Draughts and security smoke tests before planning any production rollout.
