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

### 2026-10-29 — prevent stale startup from restoring a signed-out board

- Finding: the previous auth teardown invalidated room refreshes, but a room lookup already in flight during initial page startup could still finish after sign-out, assign the room again, and recreate a realtime subscription. That leaves a narrow auth-transition race in both game pages.
- Change: introduced a separate auth-session generation counter. Chess and Draughts startup now checks it after each awaited session/room lookup and after initial sync before subscribing, and discards work belonging to an obsolete user session. Added static regression guards.
- Checks: [push run 40872109850](https://github.com/Opeaa1234/nexora-play/actions/runs/40872109850) and [PR run 40872113632](https://github.com/Opeaa1234/nexora-play/actions/runs/40872113632) passed on commit `4f7e12b5f5881197e1127e004c7b816bd378280e`. Static validation passed Deno type-check, Chess move-validation tests, and page/multiplayer security guardrails. This does not replace live staging/browser verification.
- Safety: no production SQL, Supabase settings, permissions, deployments, or live data changed. PR #2 remains draft.


### 2026-10-29 — discard stale room create/join results after auth changes
- Finding: a room insert or secure join RPC could still be pending while the lobby's authenticated session changed. When the request resolved, the old action could display a created-room code or navigate the new account into a room joined by the previous account.
- Change: room creation now captures the requesting user ID and session version, uses the captured host ID, and abandons UI follow-up if the session changes while the insert is in flight. Room joining similarly ignores stale RPC responses before displaying errors or navigating. Added static regression guards in `scripts/validate-project.mjs`.
- Commits: [room lobby fix](https://github.com/Opeaa1234/nexora-play/commit/83d7404535678353065d2b407cf97600936f5790), [regression guards](https://github.com/Opeaa1234/nexora-play/commit/9e1fb0f7ef7d5131733dff528eafed9fcb68e4fe).
- Checks: [push run 40872754210](https://github.com/Opeaa1234/nexora-play/actions/runs/40872754210) and [PR run 40872763605](https://github.com/Opeaa1234/nexora-play/actions/runs/40872763605) **PASSED** on source/guard/ledger commit `d49f62aaa1ac297c937e5189c829925d615afa8b`; Deno type-check, Chess move-validation tests, and project/security guardrails passed. Browser race behavior remains **NOT TESTED** because a separate staging backend and two-user setup are not available.
- Safety: an insert that already reached Supabase may still create a room for the original authenticated host, but stale UI results are discarded; no production SQL, Auth settings, permissions, deployments, or live data were intentionally changed. PR #2 remains draft and unmerged.
- Next action: verify CI on the updated branch, then continue source review for remaining asynchronous auth/session races. Do not mark multiplayer release-ready until isolated staging and two-player browser tests pass.


### 2026-10-29 — invalidate profile saves synchronously on auth transitions
- Finding: account profile reads were version-guarded when their results returned, but the auth listener only scheduled the next render with `setTimeout`. That left a narrow event-loop window in which an old profile read or save could still update the UI after Supabase had already emitted sign-out/account-switch. The profile-save handler also lacked exception-safe button restoration.
- Change: the auth listener now increments the session render generation synchronously before deferring UI rendering. Profile saves capture that generation, abandon stale session reads/write responses, report errors only for the still-current session, and always re-enable the save button in `finally`. Added static regression guards.
- Commits: [account fix](https://github.com/Opeaa1234/nexora-play/commit/663a72b095587db744cee285581b482cf1b65228), [regression guards](https://github.com/Opeaa1234/nexora-play/commit/3a226b4f7a80920261619de296d81e3fecd51fa0).
- Checks: [push run 40873403132](https://github.com/Opeaa1234/nexora-play/actions/runs/40873403132) and [PR run 40873415665](https://github.com/Opeaa1234/nexora-play/actions/runs/40873415665) **PASSED** on source/guard/ledger head `1ba977de665ec0addb70512d6388307111d6b878`, including Deno type-check, 12 Chess validation tests, and project/security guards. An earlier PR run caught the expected old auth-listener string in a static guard; the guard was updated to assert the synchronous invalidation behavior, and subsequent push/PR runs passed. Real auth behavior remains **NOT TESTED** in a browser because isolated staging is not available.
- Safety: no production SQL, permissions, Auth settings, deployments, or live data changed. PR #2 remains draft and unmerged.


### 2026-10-29 — ignore stale multiplayer move completions after auth changes
- Finding: Chess and Draughts cleared the board and realtime subscription on sign-out, but an already-submitted move request could still resolve afterward and overwrite the new session's status message (for example, displaying “Move saved” after the signed-out prompt). Its `finally` block could also repaint or reset the busy flag after teardown.
- Change: both move handlers capture the auth generation and only report success/errors or run UI cleanup if that generation is still current. Added static regression guards for both clients.
- Commits: Chess `6d0e19ca8b1fbc29c97d8184948980d62b205a37`; Draughts `fad4b54a12c7347582b29228a01fdb0bf63a7ef2`; regression guard `d38323beff5ec6e11a72696cbe94a4e4918c7e4c`.
- Checks: source, regression-guard, and ledger-head CI passed: [Chess source run 40873975462](https://github.com/Opeaa1234/nexora-play/actions/runs/40873975462), [Draughts push run 40873980999](https://github.com/Opeaa1234/nexora-play/actions/runs/40873980999), [Draughts PR run 40873986787](https://github.com/Opeaa1234/nexora-play/actions/runs/40873986787), [guard run 40874056825](https://github.com/Opeaa1234/nexora-play/actions/runs/40874056825), and [ledger push run 40874064080](https://github.com/Opeaa1234/nexora-play/actions/runs/40874064080) plus [PR run 40874074021](https://github.com/Opeaa1234/nexora-play/actions/runs/40874074021). Deno type-check, Chess validation tests, and static project/security guards passed. Auth-transition behavior during an in-flight move remains **NOT TESTED** without isolated staging and two authenticated users. The new documentation-only commit below needs its own CI confirmation.
- Safety: no SQL, production Supabase settings, permissions, deployments, or live data changed. PR #2 remains draft and unmerged.
- Next action: check push and PR Actions for this head, then continue the targeted source review and staging prerequisites.


### 2026-10-29 — clear room codes on account transitions
- Finding: the lobby correctly removed its room-list subscription and cleared the public-room list after sign-out, but the previously created-room panel and feedback text could remain visible. On a shared browser, that could leave an old private room code exposed after logout or an account switch.
- Change: the lobby now clears the created-room panel and feedback whenever the authenticated user ID changes, including sign-out. Added a static regression guard.
- Commits: lobby fix `e2cb61a275a75bbadf673697ae436141edaa79a7`; regression guard `5b3598d140999961bc56d7d669a75df7f0bb0427`.
- Checks: [push run 40874352273](https://github.com/Opeaa1234/nexora-play/actions/runs/40874352273) and [PR run 40874355891](https://github.com/Opeaa1234/nexora-play/actions/runs/40874355891) **PASSED** on the latest ledger head `9d40db4042c327929698c96c1705d9a06d016e7c`; the lobby source and guard also passed [40874284019](https://github.com/Opeaa1234/nexora-play/actions/runs/40874284019), [40874293296](https://github.com/Opeaa1234/nexora-play/actions/runs/40874293296), and guard run [40874344308](https://github.com/Opeaa1234/nexora-play/actions/runs/40874344308). Deno type-check, Chess validation tests, and project/security guardrails passed. Shared-browser and auth behavior remain **NOT TESTED** without staging. Follow-up ledger commit `f04590cebbd9bae88f42650e159a445ff62b0b20` also passed both [push run 40874433863](https://github.com/Opeaa1234/nexora-play/actions/runs/40874433863) and [PR run 40874440000](https://github.com/Opeaa1234/nexora-play/actions/runs/40874440000).
- Safety: no SQL, production Supabase settings, permissions, deployments, or live data changed. PR #2 remains draft and unmerged.
- Next action: verify CI, then continue the staging readiness checklist. Do not merge until isolated staging and two-player browser tests pass.


### 2026-10-29 — suppress stale room creation errors
- Finding: room creation checked the auth generation after each insert result, but a thrown/rejected request could enter the catch block and display an error after sign-out or account switching. That could overwrite the new session's lobby status.
- Change: the catch block now reports the failure only when both the captured session generation and user ID are still current. Added a static regression guard.
- Commits: room lobby `5f98349abb624830a116356acc1018a4845f64c8`; regression guard `ac98b22ab8315c140ca19bf574cb1020fda7d7c1`.
- Checks: source, regression guard, and ledger-head CI **PASSED**: [room-lobby source PR run 40875375513](https://github.com/Opeaa1234/nexora-play/actions/runs/40875375513), [guard push run 40875409469](https://github.com/Opeaa1234/nexora-play/actions/runs/40875409469), and latest-head [push run 40875436503](https://github.com/Opeaa1234/nexora-play/actions/runs/40875436503) plus [PR run 40875446598](https://github.com/Opeaa1234/nexora-play/actions/runs/40875446598). Static project/security checks, Deno type-check, and Chess validation tests passed. This is a source-level correction; rejected network requests during auth changes are **NOT TESTED** in browser. This ledger follow-up needs its own CI confirmation.
- Safety: no SQL, production Supabase settings, permissions, deployments, or live data changed. PR #2 remains draft and unmerged.
- Next action: verify push and PR Actions, then continue staging readiness and browser verification.


### 2026-10-29 — catch rejected room-join requests
- Finding: the lobby handled Supabase RPC errors returned as values, but an unexpectedly rejected `join_game_room` request could escape the async click handler and leave the player without a useful status message.
- Change: catch rejected join requests and display the failure only if the captured auth generation and user ID are still current. Added a static regression guard.
- Commits: lobby fix `11926418bee6304f34ca3e3576cd17b627bd9fd7`; guard `52e6cce22827ea66a834ce221f8306e340ee0e26`.
- Checks: CI for this source/guard/ledger update is pending; browser behavior for rejected RPCs and auth transitions remains **NOT TESTED** without isolated staging.
- Safety: no SQL, production Supabase settings, permissions, deployments, or live data changed. PR #2 remains draft and unmerged.
- Next action: verify push and PR checks, then continue safe source review; do not merge until staging and two-player browser tests pass.


### 2026-10-29 — suppress stale multiplayer startup errors
- Finding: Chess and Draughts startup tasks check auth generations after successful awaits, but a rejected session/room lookup could still reach the outer startup catch after sign-out or account switching and overwrite the newer session message.
- Change: capture the auth generation when starting each page and display startup errors only while that generation remains current. Added a static regression guard for both pages.
- Commits: Chess `ef27c4ed20e1b0f835db1328546f3dae8ff3e552`; Draughts `5e6b699261cd3e0b5bb02402022d73b5c9f93563`; guard `73840469046fd2238ae69212734f7d9897530ee2`.
- Checks: CI for the source/guard/ledger head is pending. Rejected lookup behavior and account transitions remain **NOT TESTED** in a real browser.
- Safety: no SQL, production Supabase settings, permissions, deployments, or live data changed. PR #2 remains draft and unmerged.
- Next action: verify CI and continue staging readiness; do not merge until isolated staging and two-player browser tests pass.


## Latest multiplayer refresh error race guard — 2026-10-29
- Follow-up source review found that realtime and manual refresh rejection handlers on Chess and Draughts could still replace current session feedback if an old refresh failed after sign-out/account switching.
- Both pages now capture the auth generation for realtime subscriptions and manual refreshes, and display errors only while that generation remains current. Added static regression guards for both pages.
- Commits: [Chess](https://github.com/Opeaa1234/nexora-play/commit/48cb61d32b323c6ca47fcff9de87bbc8d90f8142), [Draughts](https://github.com/Opeaa1234/nexora-play/commit/8aa6c9ae5b072880454d87f73c50c706f20d47ae), [validator](https://github.com/Opeaa1234/nexora-play/commit/6059ce5fc39a7ff6709f9350c655b7f7439cd431).
- CI for the source/guard/ledger head is pending verification; actual auth transitions and rejected refreshes remain **NOT TESTED** in a real browser.
- No production SQL, Supabase settings, permissions, deployments, or live data changed. PR #2 remains draft and unmerged.


## Local Draughts promotion rule — 2026-10-29
- Source review found that local two-player and computer Draughts continued a multi-jump after a man reached the king row. Under English/American draughts rules, crowning ends that capture turn; continuing as a king allowed an extra capture not permitted by the server-side move logic.
- Both local move handlers now detect a newly crowned piece and end its turn immediately; added static regression guards for the human and computer paths.
- Commits: [Draughts practice fix](https://github.com/Opeaa1234/nexora-play/commit/f6556c65dec2a15882c3cb40c811994289837acc), [regression guard](https://github.com/Opeaa1234/nexora-play/commit/d81ec3e3ffaf361300db7916eee81678df8fe79d).
- CI for this source/guard/ledger head is pending verification. Rule behavior has not been browser-tested; isolated staging and two-player multiplayer tests remain blocked.
- No SQL, production Supabase settings, permissions, deployments, or live data changed. PR #2 remains draft and unmerged.

- Validation confirmation: source commit `f6556c65dec2a15882c3cb40c811994289837acc` passed push run [40887039603](https://github.com/Opeaa1234/nexora-play/actions/runs/40887039603); guard commit `d81ec3e3ffaf361300db7916eee81678df8fe79d` passed push run [40887076679](https://github.com/Opeaa1234/nexora-play/actions/runs/40887076679) and PR run [40887083757](https://github.com/Opeaa1234/nexora-play/actions/runs/40887083757). Ledger head `6b359742a2f67fa574d83de325b86f72e690a104` passed push run [40887124094](https://github.com/Opeaa1234/nexora-play/actions/runs/40887124094) and PR run [40887132921](https://github.com/Opeaa1234/nexora-play/actions/runs/40887132921). Static validation, Deno type-check, Chess validation tests, and project/security guards passed; browser rule behavior remains **NOT TESTED**.

### 2026-10-29 — clear profile fields when switching accounts

- Finding: when a different account signed in, the account page updated the email but could leave the previous user's display name and avatar URL visible while the new profile query was pending. If the new account had no profile or its query failed, those old fields could remain in the form.
- Change: each signed-in profile render now immediately replaces the visible player name with the new account's fallback name, clears the display-name and avatar inputs, restores the neutral avatar placeholder, and shows a loading status before querying that account's profile. Added a static regression guard.
- Commits: [account fix](https://github.com/Opeaa1234/nexora-play/commit/ac76f6201b6a11d2d47a37231192bad947ee6dd7), [validator guard](https://github.com/Opeaa1234/nexora-play/commit/a891303e1fbb0281aab44e8d6c9840b60fc9179d).
- Validation: CI for this source/guard/ledger sequence is being checked. This protects against stale cross-account UI data but still needs browser verification with two real test accounts in isolated staging.
- Safety: no SQL, production Supabase settings, permissions, deployments, or live data changed. PR #2 remains draft and unmerged.


### 2026-10-29 — clear personal-best dashboard data on account switches
- Finding: the profile fields were cleared when switching accounts, but the personal-best panel could continue showing the previous player's scores while the new profile query was pending. If that profile query failed, the old scores could remain visible indefinitely.
- Change: each profile render now replaces the personal-best panel immediately with account-specific loading text; a profile-load error leaves an explicit unavailable message rather than stale scores. Added a static regression guard.
- Commits: account fix `b080ec3354b9f6f076b6de8459492f621dfd76fd`; validator guard `d5af427e5e55dfa8ce4cc391762a341be12949eb`.
- Validation: CI for these commits and the ledger update is pending. This is a source-level privacy guard; real account-switch behavior still needs two test accounts in isolated staging.
- Safety: no production SQL, Supabase settings, permissions, deployments, or live data changed. PR #2 remains draft and unmerged.
- Next action: verify push and PR Actions for the updated head, then continue targeted account/multiplayer review. Do not merge until isolated staging and real two-player Chess/Draughts browser tests pass.


### 2026-10-29 — clear account identity and dashboard data on sign-out
- Finding: the signed-out branch hid the signed-in panel but left the previous player's email, display name, avatar URL, profile status, and personal-best content in the document. This was hidden UI, but retaining account-specific data after logout was unnecessary and risked stale data resurfacing in future UI changes.
- Change: the signed-out session render now clears identity/profile fields, restores the neutral avatar, clears profile status, and replaces personal bests with a sign-in prompt. Added a static regression guard.
- Commits: account fix `d8a6e3f082b7fb0533bbf2eaa4db92bd42947be7`; validator guard `6e9446c46d1278d1b13947d30bd93ff0ebbaaea2`.
- Validation: prior head `09ffe9979bb7d79234df3179f66e1fbfff873bb5` passed both push and PR CI. New head CI is pending for this follow-up. Browser verification with two isolated staging accounts remains outstanding.
- Safety: no production SQL, Supabase settings, permissions, deployments, or live data changed. PR #2 remains open, draft, and unmerged.
- Next action: verify the new head's push and PR Actions, then continue multiplayer review. Do not merge until isolated staging and real two-player Chess/Draughts browser tests pass.

### 2026-10-29 — fail closed on missing Chess history in waiting rooms

- Finding: Chess already rejected missing saved move history for active/finished rooms, but a waiting room with missing history could fall through to `replay([])` and display a reconstructed initial board. That conflicted with the fail-closed behavior documented for multiplayer state and could mask a broken room record until the first move.
- Change: the Chess client now rejects missing or malformed saved move history in every room state and only replays a validated saved array. Added a regression guard against restoring the empty-history fallback.
- Commits: [Chess client](https://github.com/Opeaa1234/nexora-play/commit/1abb7203cf88cb5a2dfed070d047874e9190f424), [regression guard](https://github.com/Opeaa1234/nexora-play/commit/1cbc201b6915e91ffb5355072306b8e613eb51e9).
- Validation: the intermediate source-only run failed as expected because the old static guard still required the previous error text ([run 40891643386](https://github.com/Opeaa1234/nexora-play/actions/runs/40891643386)); the guard was updated in the next commit. Verify the new push and PR runs before considering this fix validated. This is a static change; browser and two-player behavior remain **NOT TESTED** without isolated staging.
- Safety: no SQL, production Supabase settings, permissions, deployments, or live data changed. PR #2 remains draft and unmerged.
- Next action: confirm CI on the regression-guard commit and its ledger follow-up, then continue reviewing multiplayer state and sync paths. Do not merge until staging and real two-player Chess/Draughts browser tests pass.

### 2026-10-29 — hide stale Chess position until refresh is verified

- Finding: even after rejecting missing Chess history in all room states, a refresh that returned malformed history or a network error could leave the previously rendered board visible. That made stale state look current.
- Change: the Chess page now clears its verified-state flag before each room refresh, shows an explicit unavailable-state placeholder, and renders the board again only after the saved move history has replayed successfully. Auth teardown also keeps the board in the unavailable state. Added a regression guard.
- Commits: [Chess client](https://github.com/Opeaa1234/nexora-play/commit/7feb36650eace76582a085a3ad48c0c4a0fb9b8e), [regression guard correction](https://github.com/Opeaa1234/nexora-play/commit/85f31e46ffe95a38cadf8a7f455eb5afb5b18c5d).
- Validation: an initial version of the new static guard had a JavaScript quoting error and failed CI; the guard was corrected. The corrected source/guard head passed both [push run 40892417942](https://github.com/Opeaa1234/nexora-play/actions/runs/40892417942) and [PR run 40892430166](https://github.com/Opeaa1234/nexora-play/actions/runs/40892430166). Deno type-check, 12 Chess validation tests, and project/security guardrails passed. Browser and two-player behavior remain **NOT TESTED** without isolated staging.
- Safety: no SQL, production Supabase settings, permissions, deployments, or live data changed. PR #2 remains draft and unmerged.
- Next action: verify CI on this ledger follow-up, then continue the multiplayer source audit. Do not merge until staging and real two-player Chess/Draughts browser tests pass.

### 2026-10-29 — distinguish Chess save failures from refresh failures

- Finding: after the server accepted a Chess move, a subsequent room refresh failure fell into the same error handler as a rejected move and told the player “Move not saved.” That was misleading and could prompt an unnecessary retry even though the move had already been committed.
- Change: the client now tracks whether the server accepted the move and reports a separate refresh/reload message if syncing the updated position fails. Added a regression guard for this distinction and retained auth-generation checks so stale responses cannot overwrite newer session feedback.
- Commits: [Chess client](https://github.com/Opeaa1234/nexora-play/commit/c4e7beedd7c71a6bdb5cb5dce28836443d2a0d56), [regression guard](https://github.com/Opeaa1234/nexora-play/commit/86c417c3c15142e217271c192b92c0d49fcc4b07).
- Validation: source/guard head passed [push run 40892834250](https://github.com/Opeaa1234/nexora-play/actions/runs/40892834250) and [PR run 40892855511](https://github.com/Opeaa1234/nexora-play/actions/runs/40892855511). Deno type-check, 12 Chess validation tests, and project/security guardrails passed. This remains source-level validation; browser behavior is **NOT TESTED** without isolated staging.
- Safety: no SQL, production Supabase settings, permissions, deployments, or live data changed. PR #2 remains draft and unmerged.
- Next action: verify the ledger follow-up's CI, then continue checking the multiplayer sync/turn paths. Do not merge until staging and real two-player Chess/Draughts browser tests pass.

### 2026-10-29 — fail closed on Draughts refresh errors and clarify move saves

- Finding: Draughts could leave the previous board visible when a room refresh failed before returning data. Also, if the server accepted a move but the follow-up refresh failed, the client reported the move as unsaved.
- Change: the client now clears its board state before each room read and shows the unavailable-state placeholder until the returned saved state validates. It separately reports a confirmed move save followed by a refresh failure. Added regression guards for both behaviors.
- Commits: [Draughts client](https://github.com/Opeaa1234/nexora-play/commit/3b8eb7f0cc9ae4fe215a598dafe012fa296cdcd4), [regression guard correction](https://github.com/Opeaa1234/nexora-play/commit/325922f93a7d450889e7c5c898fe7607ad40c93e).
- Validation: an initial version of the Draughts guard had a JavaScript quoting error and failed CI; the guard was simplified and corrected. The corrected source/guard head passed [push run 40893500412](https://github.com/Opeaa1234/nexora-play/actions/runs/40893500412) and [PR run 40893509003](https://github.com/Opeaa1234/nexora-play/actions/runs/40893509003). Deno type-check, 12 Chess validation tests, and project/security guardrails passed. Browser/two-player behavior remains **NOT TESTED** without isolated staging.
- Safety: no SQL, production Supabase settings, permissions, deployments, or live data changed. PR #2 remains draft and unmerged.
- Next action: verify the workflow-ledger follow-up, then continue multiplayer review. Do not merge until isolated staging and real two-player Chess/Draughts browser tests pass.

### 2026-10-29 — reject impossible Draughts continuation states

- Finding: the live Draughts client checked that a saved forced-capture square was on the board and belonged to the current player, but did not confirm that the piece still had a legal capture. A malformed/stale state could therefore render a playable-looking board whose moves would all be rejected by the authoritative RPC.
- Change: the client now validates that a forced continuation includes at least one legal capture before exposing the saved board. Added a regression guard to prevent removing this check.
- Commits: [Draughts client](https://github.com/Opeaa1234/nexora-play/commit/b6022f64d0b112995bdb4b767b5bae0b1e72dfb5), [regression guard](https://github.com/Opeaa1234/nexora-play/commit/42b9204bbcd8d0546a96ac415a312f0e5d2f6fac).
- Validation: the source/guard head passed [push run 40895542530](https://github.com/Opeaa1234/nexora-play/actions/runs/40895542530) and [PR run 40895551567](https://github.com/Opeaa1234/nexora-play/actions/runs/40895551567). This remains static validation; isolated staging and two-player browser testing are still outstanding.
- Safety: no SQL, production Supabase settings, permissions, deployments, or live data changed. PR #2 remains draft and unmerged.
- Next action: verify CI on this ledger follow-up and continue reviewing lobby/session and multiplayer rules. Do not merge until isolated staging and real two-player Chess/Draughts tests pass.

### 2026-10-29 — generate room codes with cryptographic randomness

- Finding: the room lobby generated six-character join codes with `Math.random()`, which is not designed for security-sensitive identifiers. Codes are still six characters under the existing schema, so this change improves unpredictability but does not replace rate limiting or server-side access controls.
- Change: room-code generation now uses `crypto.getRandomValues()`. The existing alphabet contains 32 characters, so mapping each random byte modulo 32 is unbiased. Added a regression guard that rejects a return to `Math.random()`.
- Commits: [room lobby](https://github.com/Opeaa1234/nexora-play/commit/9fc7b92f5727b63931d4a89da56c1ccc88cb7a9e), [initial regression guard](https://github.com/Opeaa1234/nexora-play/commit/9e9e6381101873d8987b285b78af81cb6f89f253), [alphabet/unbiased-mapping guard](https://github.com/Opeaa1234/nexora-play/commit/3c3e0aa3c1370c18508c1dca15d81e672f4ed440).
- Validation: source/guard head passed [push run 40896521476](https://github.com/Opeaa1234/nexora-play/actions/runs/40896521476); the follow-up alphabet guard passed [push run 40896908163](https://github.com/Opeaa1234/nexora-play/actions/runs/40896908163) and [PR run 40896920661](https://github.com/Opeaa1234/nexora-play/actions/runs/40896920661). The latest ledger commit must also pass CI. No database schema, production SQL, Supabase settings, permissions, deployments, or live data changed. PR #2 remains draft and unmerged.
- Next action: confirm CI, then review whether room-code joining has sufficient abuse/rate-limit protection. Do not change production backend policy or SQL without explicit approval; staging and real two-player tests remain release blockers.

### 2026-10-29 — record room-code guessing/rate-limit follow-up

- Read-only security review: room joins are authenticated and the join RPC locks/validates the target room, but the current source does not implement an application-level per-user throttle for repeated room-code attempts. Six-character codes remain a limited search space even when generated cryptographically.
- No backend SQL or permissions were changed for this finding. Adding attempt accounting requires a reviewed migration and staged tests; do not apply or deploy it to the live backend as part of this source-only pass.
- Follow-up: design and test a bounded per-user join-attempt limit in isolated staging, ensure legitimate retry behavior and concurrency remain correct, and review cleanup/retention of attempt records before any rollout.
- Current safety status: room-code generation now uses `crypto.getRandomValues()` and the alphabet/unbiased mapping is guarded. CI for the code/guard and latest ledger commits is recorded above; this new documentation entry must also pass CI. PR #2 remains draft and unmerged.

### 2026-10-29 — align join-code input with generated alphabet

- Finding: room codes are generated from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, but the join form accepted any uppercase letter/digit. Characters deliberately excluded from generated codes (such as I, O, 0, and 1) could still be submitted to the join RPC and produce confusing “no room found” responses.
- Change: input normalization now removes characters outside the generated alphabet, and validation requires exactly six allowed characters. Added a regression guard for the client-side normalization and format check.
- Commits: [lobby fix](https://github.com/Opeaa1234/nexora-play/commit/163c2298293a8ef9659b8759baff0a435b8f6b83), [regression guard](https://github.com/Opeaa1234/nexora-play/commit/976a620020c13950ff273bf982fd5d5b4a485a1b).
- Validation: source/guard CI is pending at the time of this ledger entry. This is input validation/UX, not a substitute for server-side abuse controls. No SQL, production Supabase settings, permissions, deployments, or live data changed.
- Next action: verify push and PR CI for this change and the ledger, then continue review of multiplayer correctness. PR #2 remains draft and unmerged; isolated staging and two-player browser testing remain release blockers.

### 2026-10-29 — prevent duplicate in-flight room joins

- Finding: repeated clicks on Join could send concurrent `join_game_room` RPCs from the same browser. The server-side row lock makes the room transition safe, but duplicate requests waste calls and can make the lobby feel unreliable on a slow connection.
- Change: the join handler now uses a single-flight guard, disables the Join button during the request, and releases the guard in `finally` on success, failure, or an auth-transition early return. Added a regression guard for the lock and cleanup.
- Commits: [lobby fix](https://github.com/Opeaa1234/nexora-play/commit/fe2b67071f02cd77f8425ffaf4f8447e1a8e3e91), [regression guard](https://github.com/Opeaa1234/nexora-play/commit/365443d9c58c5b06a9b63b6b2287fed8cd191ffa).
- Validation: the source/guard/ledger head passed [push run 40899485298](https://github.com/Opeaa1234/nexora-play/actions/runs/40899485298) and [PR run 40899496964](https://github.com/Opeaa1234/nexora-play/actions/runs/40899496964). This is client-side request de-duplication only, not server-side rate limiting. No SQL, production Supabase settings, permissions, deployments, or live data changed.
- Next action: verify both push and PR CI, then continue review of multiplayer correctness and staged abuse controls. PR #2 remains draft and unmerged; isolated staging and real two-player tests remain release blockers.

### 2026-10-29 — align direct multiplayer URL code validation

- Finding: the lobby required the generated six-character alphabet, but both live board pages accepted any uppercase alphanumeric code in the URL. Direct links containing excluded characters could still trigger unnecessary database lookups and inconsistent validation.
- Change: Chess and Draughts now validate URL codes against the same exact alphabet as the lobby. Added a regression guard covering both board pages.
- Commits: [Chess](https://github.com/Opeaa1234/nexora-play/commit/d15eafdef7fe13bdc33679e29fd50b18f6548c39), [Draughts](https://github.com/Opeaa1234/nexora-play/commit/8b6181f9f4e697d2ac938ef6d99ed8e212004555), [regression guard](https://github.com/Opeaa1234/nexora-play/commit/fefb7dede7f2b44d1ad97efc7240bad1fb47f845).
- Validation: source/guard and ledger CI must pass before this is considered validated. This aligns client-side validation only; server-side authorization and rate limiting remain necessary. No SQL, production Supabase settings, permissions, deployments, or live data changed.
- Next action: verify push and PR CI, then continue staging and multiplayer correctness review. PR #2 remains draft and unmerged; isolated staging and real two-player tests remain release blockers.
