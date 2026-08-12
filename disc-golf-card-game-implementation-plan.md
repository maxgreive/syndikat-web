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

- Host a containerized Node.js API and WebSocket service on Coolify for separate-phone room sync.
- Run PostgreSQL as a private, persistent Coolify service. Keep the database inaccessible from the public internet; only the API may connect to it.
- Support room creation with a short room code/link.
- Let players join by display name without user accounts.
- Store the joining player's room id, player id, and private token in `localStorage`.
- Put only the room code in the URL, not private player tokens.
- Use WebSocket room subscriptions so joined phones update when cards are drawn, played, discarded, or when hole scoring changes.
- Return each player only their own hand after validating their private token; do not expose hands in room-wide API or socket payloads.

## Backend And Deployment

- Build a small Node.js service (Fastify or Express plus Socket.IO) with a REST API for commands and WebSockets for room-state updates.
- Treat the backend as authoritative: clients request actions, while the server validates rules and writes the resulting state in a database transaction.
- Keep the Jekyll/Svelte frontend as a static deployment. Configure its production build with `CHAIN_CHAOS_API_URL=https://api.syndikat.golf`.
- Add a backend `Dockerfile` and a production `docker-compose.yml` containing `api` and `postgres` services.
- In Coolify, deploy the Compose stack from this repository, route `api.syndikat.golf` to the API container, enable HTTPS, and do not expose the PostgreSQL service.
- Add a `/health` endpoint and Compose health checks for both services. Make the API wait for a healthy database before serving traffic.
- Configure persistent database storage, automated encrypted backups, restore testing, resource limits, deployment logs, and a rollback procedure.
- Configure required production environment variables in Coolify: `DATABASE_URL`, `SESSION_SECRET`, `CORS_ORIGIN`, `PORT`, and `NODE_ENV=production`. Keep secrets out of Git and frontend build output.
- Use separate Coolify staging and production environments, each with its own database and secrets.

## PostgreSQL Schema

- `card_game_rooms`
  - Room metadata, language, current hole, skin carryover, status, host player id, expiry time, and timestamps.
- `card_game_players`
  - Room membership, display name, player token hash, score, skins.
- `card_game_events`
  - Append-only event log for draw, play, score, discard, undo, reset.
- `card_game_snapshots`
  - Optional compact room state for faster load and recovery.
- Store the deck, discard pile, played cards, and private hands in backend-owned state. Add indexes for room code, room membership, and event order.
- Use database migrations, foreign keys, constraints, and transactions. Never rely on frontend checks alone for game integrity.

## Game Rules

- Support 2-4 players or teams.
- Deal three starting cards to each player.
- Enforce a seven-card hand limit.
- Allow one card played by each player per hole.
- Allow one card played on each player per hole.
- Track per-hole scores, tied holes, skins carryover, and untied hole winners.
- Award draws to non-winning players after an untied hole.
- Include host-only controls for reset, undo, kick, and ending the round.
- Expire inactive rooms after a defined retention period and provide a scheduled cleanup job.

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
- Build the backend image and run backend unit and integration tests.
- Confirm existing Svelte tools and the new game bundle build correctly.
- Manually test room creation and joining from two browser profiles/devices.
- Verify each player only sees their own hand.
- Test starting deal, card play, discard, tied hole scoring, untied hole scoring, skins carryover, and reward draws.
- Verify hand limit behavior and one-card-per-hole restrictions.
- Switch German/English and confirm UI/card text changes cleanly.
- Refresh/rejoin and confirm room state restores.
- Confirm WebSocket updates reach joined clients, including reconnect and stale-session handling.
- Confirm normal API/socket clients cannot read or act as another player, and that room-wide payloads never include other players' hands.
- Verify database persistence, automated backup creation, a test restore, Coolify health checks, HTTPS, and a deployment rollback.

## Assumptions

- This is an original disc golf card game with original branding, card names, card text, and visual design.
- Separate phones require the Coolify API, PostgreSQL, WebSocket, DNS, and deployment configuration outside the static Jekyll build.
- Per-player hand privacy is casual-game privacy, not high-security anti-cheat.
- No user accounts are required for the first version.
- Svelte is the chosen frontend implementation for this feature.
