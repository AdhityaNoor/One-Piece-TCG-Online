# /src/multiplayer — the network seam

Everything a future authoritative-server multiplayer mode needs to plug into,
kept out of the engine (Layers 1–2 stay UI- and network-agnostic) and out of
the app screens (they only ever talk to the interfaces here).

## rooms/

`RoomService` is the transport-agnostic lobby API used by the Casual mode
(deck pick → room list → join → match). Two implementations:

- `mockRoomService` — today's local, no-backend stand-in. Synthesizes rooms
  from the player's own saved decks so the whole Casual flow is clickable
  offline. Deterministic under a fixed seed (see `__tests__`).
- `NetworkRoomService` (not built yet) — will implement the same interface
  over the real server. Swapping it in is a one-line change in
  `app/lib/runtime.ts#createRoomService`; no store or screen changes.

Everything crossing this boundary is plain JSON-serializable data, matching
the engine's own serialization rule.

## Where "no opponent action yet" lives

Casual matches run the same local, authoritative engine as hotseat, but the
UI (Layer 3/4) pins the board to the local seat (`matchStore.localPlayerId`)
and only enables input while `getActingPlayerId() === localPlayerId`. When
authority is the opponent's, `MatchScreen` renders `WaitingForOpponent`
instead of the ActionBar and suppresses opponent-owned pending-choice prompts.

In a real online match, the opponent's actions arrive over a transport and
clear that waiting state. Until a `MatchTransport` (the planned next seam:
`dispatch → server → broadcast → apply`) exists, a Casual match halts on the
opponent's first required action (including the shared pre-game mulligan). That
is intentional and correct for an authoritative-server design — see
`docs`/CLAUDE.md and the match-store comments — not a bug to work around by
letting this client act for the opponent.

## Known limitations (current build)

- No `MatchTransport` yet: opponent moves never occur locally, so a Casual
  game is playable only up to the point the opponent must first act.
- `mockRoomService` cheats by backing each "opponent" with a local deck; a
  real server ships the opponent's own normalized deck snapshot instead.
- Room lists do not live-update (no subscription/websocket); the lobby
  re-queries on an explicit Refresh.
