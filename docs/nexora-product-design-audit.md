# Nexora Play — Product and Design Audit

**Status:** Phase 1 discovery/design specification  
**Scope:** Existing repository reviewed at source level; runtime and live-browser behavior are not yet verified.  
**Principle:** Preserve useful existing work. Inspect first, compare with the product vision, then make targeted changes and test them.

## Product vision

Nexora Play is an open-door gaming community for Nigeria and gamers worldwide. Its central experience brings together:
- Playing accessible browser games
- Meeting and connecting with other gamers
- Competing through multiplayer play and, later, organized tournaments
- Developing player identity and a sense of community

Do not present future features as available until they are implemented and tested.

## Current repository inventory

| Area | Existing source | Initial review |
|---|---|---|
| Home and discovery | `index.html` | Hero, navigation, categories, game discovery, search/sort, promotional sections and gaming news |
| Browser arcade | `games.html` | Large single-page collection of embedded mini-games and controls |
| Player account | `account.html` | Login/signup, profile, avatar, favorites and statistics/dashboard sections; persistence requires verification |
| Multiplayer lobby | `rooms.html` | Host/join room flows, room code and public-room concept |
| Board games | `chess.html`, `draughts.html` | Standalone chess and draughts pages |
| Multiplayer board games | `multiplayer-chess.html`, `multiplayer-draughts.html` | Multiplayer pages integrated with Supabase |
| Trust and compliance | `trust-compliance.html` | Privacy, safety, business and payment-related content |
| Backend | `supabase/`, `supabase-config.js` | Room schema and server-side move functions; policies and runtime behavior require further validation |

## Page-by-page design specification

### 1. Home — `index.html` (P0)
**Preserve:** Existing discovery features, categories, search/sort, promotional areas and gaming-news section.

**Improve:**
- Give the first screen a clear explanation of Nexora Play and a primary action to play.
- Make the three main journeys easy to find: Play Games, Find Players, and Compete.
- Use consistent game cards, spacing, typography and calls to action.
- Ensure search, category filtering and sorting work together and have useful empty states.
- Make navigation usable on mobile and keep labels consistent on every page.
- Keep community/tournament promotions honest: label planned features as coming soon until real functionality exists.

**Verify:** All links; search and sorting; account state; mobile navigation; image loading; keyboard focus; console/network errors.

### 2. Arcade — `games.html` (P0)
**Preserve:** The existing mini-game collection and its variety.

**Improve:**
- Group games into understandable categories and provide a consistent card/launch pattern.
- Standardize game instructions, score display, restart/pause controls where appropriate, and game-over states.
- Check touch controls and layout on small screens.
- Consider splitting repeated styles and scripts into shared files after confirming dependencies; avoid a risky rewrite of all games at once.

**Verify:** Every game's start/restart/end path, score logic, keyboard/touch input, resize behavior, and errors.

### 3. Account — `account.html` (P0)
**Preserve:** Login/signup and the existing profile, avatar, favorites and statistics concepts.

**Improve:**
- Clearly distinguish signed-out, loading, signed-in, and failed-authentication states.
- Explain validation errors and recovery actions in plain language.
- Provide empty states for favorites and statistics.
- Validate avatar inputs and handle failed image loads.
- Ensure personal information and game records are only visible to authorized users.

**Verify:** Sign-up, sign-in, sign-out, refresh persistence, invalid credentials, session expiry, profile updates, data access rules, and mobile layout. Do not assume dashboard sections are functional just because they exist in HTML.

### 4. Rooms — `rooms.html` (P0)
**Preserve:** Host room, join by code, and public-room discovery.

**Improve:**
- Explain the host/join choice before the user submits.
- Make room code entry forgiving but validated.
- Show waiting, joining, playing, full, expired and connection-failed states.
- Prevent duplicate join actions and clearly explain whether a room is public or private.

**Verify:** Two-user flows, invalid and reused codes, simultaneous joins, host disconnects, guest disconnects, room expiry, RLS policies and realtime subscriptions.

### 5. Standalone chess and draughts (P1)
**Preserve:** Existing playable board-game pages.

**Improve:** Align board styling, piece contrast, turn indicators, controls, instructions, restart and terminal-game messages with one shared pattern.

**Verify:** Legal move rules, captures, promotion, check/checkmate or draughts end states, restart behavior, keyboard/screen-reader usability where applicable.

### 6. Multiplayer chess and draughts (P0)
**Preserve:** Existing Supabase-backed multiplayer direction.

**Improve:** Make connection status, whose turn it is, opponent presence, rematch/restart availability and finished games explicit.

**Security/reliability note:** The reviewed chess move function appeared to validate move format, player and turn but not full legal chess rules. Client-submitted moves must not be trusted. Legal move validation and game-over detection should be authoritative. Review the draughts move function and all relevant RLS policies against edge cases before relying on it.

**Verify:** Both players see the same state; reconnect/resume; illegal move rejection; stale/duplicate moves; turn enforcement; disconnects; terminal states; unauthorized reads/writes.

### 7. Trust and compliance — `trust-compliance.html` (P1)
**Preserve:** Existing safety, privacy, business and payments topics.

**Improve:** Separate current capabilities from planned capabilities. Do not imply payment processing, regulatory approval, certification or verification unless substantiated. Link to real privacy/terms/contact documents where available.

**Verify:** Every claim, link, policy, data-collection statement and payment-related statement against the actual implementation and operating arrangements.

## Shared design system

Initial design direction: dark gaming interface, energetic accents, clear typography, accessible contrast and welcoming copy. Proposed starting tokens (confirm against the current CSS before applying):
- Background: `#0B1020`
- Surface: `#151D33`
- Primary action: `#6C63FF`
- Accent/status highlight: `#20D9C2`

Define shared tokens and patterns for typography, spacing, cards, buttons, navigation, form fields, game status, alerts, loading states, focus rings and mobile breakpoints. Include reduced-motion support and keyboard-visible focus. Color must not be the only way to communicate status.

## Recommended delivery order

1. **Baseline and safety:** inventory routes/assets/scripts, check browser errors, confirm Supabase configuration and RLS, and record existing behavior before editing.
2. **Shared visual foundation:** add consistent design tokens and reusable patterns without changing game logic.
3. **Home page:** make the product purpose and key journeys clear.
4. **Arcade and account:** improve consistency and test existing behavior.
5. **Rooms and multiplayer:** prioritize authorization, state synchronization, edge cases and clear status feedback.
6. **Board-game polish:** align standalone and multiplayer board-game UX.
7. **Community and tournaments:** only after the foundational player, room and competition flows are reliable.
8. **Release checks:** test mobile and desktop, keyboard access, links, auth, realtime behavior, errors and deployment.

## Acceptance checklist

- [ ] Existing routes and game experiences are inventoried.
- [ ] No page claims an unimplemented feature is live.
- [ ] Navigation and visual patterns are consistent across pages.
- [ ] Main journeys work on phone and desktop.
- [ ] Authentication and private data access are verified.
- [ ] Room creation/joining and realtime behavior are tested with two sessions.
- [ ] Server-side move validation and game completion are tested.
- [ ] Keyboard focus, contrast, reduced motion and form labels are checked.
- [ ] Browser console and network errors are reviewed.
- [ ] Changes are tested on a separate branch before merging/deploying.

## Limitations of this audit

This is a source-level review, not a completed runtime QA pass. HTML presence does not prove that a feature works. No visual redesign, gameplay changes, or production deployment is implied by this document.
