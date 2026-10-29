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
9. Merge each eligible pull request after its relevant CI passes and the corresponding behavior has been verified in an appropriate test environment. Static validation alone does not clear staging or live-integration gates; keep functionality-dependent PRs in draft until those gates pass.

## Current release ledger — 2026-10-28

### Repository and automation

- **PASS** — Work branch: `redevelopment/phase-2-homepage`.
- **PASS** — Open draft PR: [#2](https://github.com/Opeaa1234/nexora-play/pull/2).
- **PASS** — Documentation-only product/design audit PR [#1](https://github.com/Opeaa1234/nexora-play/pull/1) merged as `3b0cda4735b102cd1394bf7a0843d734a63de6cf` after reviewing the complete patch; it contains no runtime code. PR #2 remains draft because multiplayer integration is not yet verified.
- **PASS** — Latest reviewed source/validator commit before this ledger entry: `3a9efb1fa682e58e1bedf6073801b7192e69083b` (account auth callback/profile-loading fix).
- **PASS** — Latest confirmed validation before this ledger entry: [GitHub Actions 40761252553](https://github.com/Opeaa1234/nexora-play/actions/runs/40761252553), passed on commit `3a9efb1fa682e58e1bedf6073801b7192e69083b`. Deno type-check, Chess move-validation tests, and project/security guardrails passed. This ledger update will trigger another validation run.
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


### 2026-10-28 — reject missing saved Draughts move history

- Change: source review found that the Draughts SQL RPC converted a missing `game_state.moves` field into an empty array when the board was present. The RPC now rejects missing saved history, and the project validator guards against reintroducing that fallback.
- Commits: SQL fix `5a396b598349984a7834a6b38455683e9081ab88`; validator guard `e64e61058d25fcc3ff40d351ef69223a732b02bd`.
- Live impact review: read-only inspection found four live rooms, all Chess rooms in `waiting` status with no board/history fields. No live Draughts room is affected by this stricter check; no rows or production settings were changed.
- Checks: [GitHub Actions run 40753916627](https://github.com/Opeaa1234/nexora-play/actions/runs/40753916627) passed for the SQL/validator source commit; [run 40753934995](https://github.com/Opeaa1234/nexora-play/actions/runs/40753934995) passed for the subsequent ledger commit. Deno type-check, Chess validation tests, and the project/security guardrails passed.
- State: **PASS** for static validation and the missing-history guardrail. The Draughts SQL has not been applied to staging or production and still requires integration testing.
- Next action: verify GitHub Actions for the source/validator commit, then record the result and continue reviewing server-side game-state integrity.


### 2026-10-28 — reject missing Draughts boards during move submission
- Change: the Draughts move RPC previously initialized a fresh board if a playing room had lost its saved board and its move history was absent/empty. The RPC now rejects a missing or null game state/board instead of attempting to reset a playing game. The project validator now requires this fail-closed behavior and rejects reintroducing the initialization fallback.
- Commits: SQL fix `0726d14e0ff70bf610efeb618f277c3735d32c2a`; validator guard updates `93125b0004f2c8ea6311273cfeac8413e20329a9` and `3ce9d838b1c40b31d973a3ec564be863d4c9b47b`.
- Checks: [GitHub Actions 40754741092](https://github.com/Opeaa1234/nexora-play/actions/runs/40754741092) passed on `3ce9d838b1c40b31d973a3ec564be863d4c9b47b`, including Deno type-check, Chess move-validation tests, and project/security guardrails.
- State: **PASS** for static validation; **NOT TESTED** against a live staging Draughts game because no separate staging project is available. No production SQL, data, permissions, or deployments were changed.
- Merge rule: PRs will be merged only after their relevant checks pass and corresponding functionality is verified in the appropriate environment. PR #2 remains blocked on staging integration and two-player E2E testing.
- Next action: refresh PR status, confirm the ledger commit's CI, review the documentation-only PR #1, and continue targeted source review without modifying production.


### 2026-10-28 — fail closed on missing Draughts client state
- Change: the multiplayer Draughts client previously defaulted missing saved move history to an empty array, and displayed a reconstructed initial board for a waiting room whose saved board was absent. The client now rejects missing history whenever a saved board is present and rejects a missing board instead of rendering a reconstructed board. Static guardrails require both checks.
- Commits: client history rejection `c89f50a2948452b4d6ece7196fb29254b66c917a`; validator guard `be3a7d946dca06ae0d34a19f5a5f663588a55c39`; missing-board fallback removal `762b4ffeb57a43737139ac6e14fee406a96e1b72`; validator guard `740fd2f5f8a8b9a60c42a9142b985492afac87e4`.
- Checks: [GitHub Actions 40755213631](https://github.com/Opeaa1234/nexora-play/actions/runs/40755213631) passed on `be3a7d946dca06ae0d34a19f5a5f663588a55c39`; [run 40755366484](https://github.com/Opeaa1234/nexora-play/actions/runs/40755366484) passed on `740fd2f5f8a8b9a60c42a9142b985492afac87e4`. Both covered Deno type-check, Chess move-validation tests, and project/security guardrails.
- State: **PASS** for static checks; **NOT TESTED** against a separate staging backend. No production SQL, data, permissions, Auth settings, or deployments were changed.
- Pull request status: PR #1 is merged as a documentation-only change. PR #2 remains draft until staging SQL/function integration, browser E2E, and two-user Chess/Draughts checks pass.
- Next action: confirm CI for the ledger update, continue source review, and do not merge PR #2 solely because static CI is green.


### 2026-10-28 — show hosts their private waiting rooms
- Change: the lobby's open-room query previously required `is_public = true`, hiding a host's own private waiting room even though the UI supports reopening rooms owned by the current host. The query now includes public waiting rooms plus rooms owned by the signed-in host, while still filtering to waiting rooms with no guest. Added a static validator guard to prevent regressions.
- Commits: lobby query `44138251f7f3052da3adf180e373e5cd39874e8e`; validator guard `06b4661f91a9b6f84d7df47f5509fe7a46ef8548`.
- Checks: [GitHub Actions 40756495841](https://github.com/Opeaa1234/nexora-play/actions/runs/40756495841) passed for the lobby query commit; [run 40756625740](https://github.com/Opeaa1234/nexora-play/actions/runs/40756625740) passed on the later branch head including the validator guard and this ledger entry.
- State: **PASS** for the query change's static validation; **NOT TESTED** in a live browser session because no staging backend is available. No production SQL, permissions, data, or deployments changed.
- Next action: confirm CI for the latest branch head, continue multiplayer source review, and keep PR #2 in draft until staging and two-player E2E checks pass.


### 2026-10-28 — fail closed in Draughts renderer when state is unavailable
- Finding: despite earlier loader checks, `paint()` still used `state || initialBoard()`. If saved state was missing/malformed and loading failed, the page could continue displaying a fresh initial board, contradicting the state-integrity safeguards.
- Fix: renderer now shows an explicit “Waiting for verified saved board state…” placeholder when state is unavailable; it no longer calls `initialBoard()` as a display fallback. Sync clears the current state and clears the board before validating newly fetched state, preventing stale or fabricated positions from being shown after a bad payload. Added static regression guards for both behaviors.
- Commits: renderer fix `2db6d9462d8e63194fa90a9afaab3def2ce43b02`; validator guard `a01f7c7d80ea7827853bda0241ae8fb90db2d06f`.
- Checks: [GitHub Actions 40760091479](https://github.com/Opeaa1234/nexora-play/actions/runs/40760091479) passed on the latest source/validator commit, including Deno type-check, Chess move-validation tests, and project/security guardrails.
- State: **PASS** for static validation; **NOT TESTED** in browser/staging. No production SQL, data, permissions, Auth settings, or deployments were changed.
- Next action: confirm CI for this ledger update, continue source review, and keep PR #2 in draft until staging integration and two-player E2E checks pass.


### 2026-10-28 — avoid duplicate profile loads from auth callbacks

- Finding: the account page called `showSession(session)` for every Supabase auth-state event, including initial-session and token-refresh events, while login/signup/logout handlers also rendered the same session explicitly. Concurrent profile reads could both observe a missing profile and race to insert it, producing a misleading duplicate-profile error.
- Change: the auth listener now defers session rendering outside the auth callback and only reacts to sign-in/sign-out events (while preserving the dedicated password-recovery event handling). Login/signup/logout flows rely on the event for session rendering rather than repeating the same call. Added validator guards for the intended event handling.
- Commits: account fix `fd9d2179764c63540d311fbcb8bc82fb10f365b4`; validator guard `3a9efb1fa682e58e1bedf6073801b7192e69083b`.
- Checks: [GitHub Actions run 40761252553](https://github.com/Opeaa1234/nexora-play/actions/runs/40761252553) passed on `3a9efb1fa682e58e1bedf6073801b7192e69083b`, including Deno type-check, Chess move-validation tests, and project/security guardrails.
- State: **PASS** for static validation. Real auth callback behavior is still **NOT TESTED** against staging; no live database or production deployment was changed.
- Risks/blockers: separate staging Supabase project and staging-only GitHub secrets are still missing; PR #2 remains draft until backend integration and two-player E2E tests pass.
- Next action: continue targeted review of auth/profile state transitions, then resolve staging prerequisites before environment-backed testing.

### 2026-10-29 — discard stale account session renders

- Finding: although auth-state rendering is now limited to sign-in/sign-out events, `showSession` performs asynchronous profile reads and potentially a profile insert. If a user signs out or another session event occurs while an earlier profile request is pending, that older request could finish later and restore stale account UI or personal-best data.
- Change: added a monotonically increasing session-render version. Each session transition invalidates earlier profile work; stale profile-read/insert results are discarded before they can update the UI. Added static regression guards in `scripts/validate-project.mjs`.
- Commits: account guard and validator guard are recorded in the branch history; CI result pending at time of this note.
- Validation: static source guard added. Wait for the branch's new GitHub Actions run before treating CI as passed. Browser-level auth races remain unverified until a separate staging Supabase environment is available.
- Safety: no SQL, production Supabase settings, deployments, permissions, or live data were changed. PR #2 remains draft; do not merge until backend integration and two-player E2E tests pass.

### 2026-10-29 — discard stale personal-best query results

- Finding: the session-render guard still awaited `loadPersonalBests`, whose independent asynchronous query wrote to the dashboard without checking whether the account session had changed while the request was pending. A delayed score query could therefore overwrite the current user's dashboard after sign-out or a different sign-in.
- Change: pass the active session-render version into `loadPersonalBests` and discard the query result if a newer session render has started. Added a validator regression guard covering both the version argument and post-query check.
- Commits: account fix `5ca48802deac30511d4f6200ff8af30a4870945b`; validator guard `9dc1533906594c33c61ab23216b5ab3cdbe90df8`.
- Validation: [GitHub Actions run 40869399534](https://github.com/Opeaa1234/nexora-play/actions/runs/40869399534) passed on ledger commit `0ca8e64200e97bd2ca6c4b984e2e7cac8327f6d3`; the account and validator commits also passed runs 40869372253 and 40869391956 respectively. Deno type-check, Chess move-validation tests, and static project/security guards passed. Browser-level race testing still requires isolated staging.
- Safety: no production SQL, Supabase settings, permissions, deployments, or live data were changed. PR #2 remains draft pending staging and two-player E2E verification.


### 2026-10-29 — guard room lobby against stale auth and room queries

- Finding: the lobby reran its account check for every Supabase auth event and could keep a realtime subscription after sign-out. Overlapping room-list requests could also finish after an account transition and render results for the previous user.
- Change: versioned lobby session transitions and room-list requests; only sign-in/sign-out events now trigger the transition handler, stale query/realtime results are ignored, and the lobby removes its realtime channel on sign-out. Added static regression guards in `scripts/validate-project.mjs`.
- Commits: lobby fix `69ec9ce0a9ca4632be7dd50388b5901979b74678`; regression guards `7e5c3321a10c10ea100dd68f2474d34afd57f321` and `f947ee6ecf79222a16aa506ee99f98caf7d7d20b`.
- Follow-up hardening: invalidate the session version synchronously inside the auth callback before deferring async work; guarded by validator commit `e4ee0b6a5fafa356479c29683e46d4d16e98d908` and `f31457541d20e18da6584743b9972c636f5afaa6`, with lobby adjustments `2239c135e2b5e2cafa1fb944465547fcc2e95621`. A CI run exposed that the older static guard still expected the original query variable name; the guard was updated to match the captured session user.
- Checks: [GitHub Actions run 40870200855](https://github.com/Opeaa1234/nexora-play/actions/runs/40870200855) passed on commit `35a31a18d5af5dd495c3c54a8a57bdafb984ef2d`, including Deno type-check, all 12 Chess validation tests, and page/multiplayer security guardrails. CI for this follow-up ledger commit still needs confirmation.
- Safety: no SQL, production Supabase settings, permissions, deployments, or live data changed. Real auth/realtime behavior remains untested until an isolated staging backend is available. PR #2 remains draft.

### 2026-10-29 — clear multiplayer clients after auth changes

- Finding: Chess and Draughts pages loaded the authenticated user once at startup but did not react to a later sign-out or account switch. Their old board and realtime subscription could remain visible after the session changed, and manual Draughts refresh could dereference a cleared room.
- Change: both game clients now invalidate pending room reads, remove their realtime channel, clear the displayed game state, and prompt the player to sign in and reopen the room when the current user signs out or switches accounts. Draughts refresh safely returns when no room is active. Added static regression guards.
- Checks: [GitHub Actions run 40871412259](https://github.com/Opeaa1234/nexora-play/actions/runs/40871412259) and [PR run 40871418809](https://github.com/Opeaa1234/nexora-play/actions/runs/40871418809) passed on commit `7b94c8739379fc43980073983eabe0c925316d1c`. The static-validation job passed Deno type-check, all Chess move-validation tests, and page/multiplayer security guardrails. This does not substitute for staging tests with two authenticated users.
- Safety: no production SQL, Supabase settings, permissions, deployments, or live data changed. PR #2 remains draft pending isolated staging and multiplayer E2E verification.
