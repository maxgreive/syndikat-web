# Digital Disc Golf Card Game Implementation Plan

## Summary

Build an original, bilingual, multiplayer disc-golf round card game for this Jekyll site using Svelte. The game should be an on-course companion for casual rounds, using an original name, original card copy, and original visual design.

## Core Product

- Add a new tool page, likely `/disc-golf-card-game/`, with a dedicated Jekyll layout and a Svelte mount point.
- Extend the existing `svelte-components` build setup with a new game entrypoint and page-specific bundle loading.
- Use Svelte stores/components for room state, player hand state, scoring, language, and realtime sync.
- Add the tool to `_data/tools.yml` so it appears on the Tools page.
- Use a new, non-infringing game name such as `Chain Chaos` / `Kettenchaos`.

## Multiplayer And State

- Use Supabase, already present in the repo, for separate-phone room sync.
- Support room creation with a short room code/link.
- Let players join by display name without user accounts.
- Store the joining player's room id, player id, and private token in `localStorage`.
- Put only the room code in the URL, not private player tokens.
- Use realtime subscriptions so joined phones update when cards are drawn, played, discarded, or when hole scoring changes.
- Show each player only their own hand through player-scoped tokens/policies.

## Supabase Schema

- `card_game_rooms`
  - Room metadata, language, current hole, skin carryover, status, host token hash.
- `card_game_players`
  - Room membership, display name, player token hash, score, skins.
- `card_game_events`
  - Append-only event log for draw, play, score, discard, undo, reset.
- `card_game_snapshots`
  - Optional compact room state for faster load and recovery.

## Game Rules

- Support 2-4 players or teams.
- Deal three starting cards to each player.
- Enforce a seven-card hand limit.
- Allow one card played by each player per hole.
- Allow one card played on each player per hole.
- Track per-hole scores, tied holes, skins carryover, and untied hole winners.
- Award draws to non-winning players after an untied hole.
- Include host-only controls for reset, undo, kick, and ending the round.

## Deck And Copy

- Store card content as structured data with German and English text.
- Create original card categories such as advantage, challenge, restriction, defense, and recovery.
- Keep card effects lightweight enough for field play and avoid complex edge-case automation.
- Prefer guided enforcement with manual override where casual play needs flexibility.

## UI Views

- Create room.
- Join room.
- Player hand.
- Current hole controls.
- Played cards this hole.
- Scoreboard and skins.
- Language toggle.
- Host/destructive controls gated by host token.

## Test Plan

- Run `npm run build`.
- Confirm existing Svelte tools and the new game bundle build correctly.
- Manually test room creation and joining from two browser profiles/devices.
- Verify each player only sees their own hand.
- Test starting deal, card play, discard, tied hole scoring, untied hole scoring, skins carryover, and reward draws.
- Verify hand limit behavior and one-card-per-hole restrictions.
- Switch German/English and confirm UI/card text changes cleanly.
- Refresh/rejoin and confirm room state restores.
- Confirm Supabase realtime updates reach joined clients.
- Confirm policies prevent normal client reads of other players' hands.

## Assumptions

- This is an original disc golf card game with original branding, card names, card text, and visual design.
- Separate phones require Supabase schema/config changes outside the static Jekyll build.
- Per-player hand privacy is casual-game privacy, not high-security anti-cheat.
- No user accounts are required for the first version.
- Svelte is the chosen frontend implementation for this feature.
