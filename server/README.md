# OPTCG Online — Backend Service

Authoritative backend for the One Piece TCG Online simulator:

- **Express** REST API (JWT email/password auth)
- **Colyseus** realtime server (authenticated 1v1 `GameRoom`)
- **MongoDB Atlas** persistence (users + finished-match history)
- Deployed as a **Docker** container to **Google Cloud Run**

The frontend stays on Vercel and is unchanged except for an additive auth +
online-multiplayer layer. Local hot-seat and the offline "Casual" mock lobby
keep working with no backend at all.

## Stack & prerequisites

| Piece            | Version / tool |
|------------------|----------------|
| Runtime          | Node.js **≥ 20** (Cloud Run base image `node:20-slim`) |
| Realtime server  | `@colyseus/core@^0.17`, `@colyseus/ws-transport@^0.17`, `@colyseus/schema@^4` (core directly — the `colyseus` meta-package pulls in monitor/playground/tools we don't need) |
| Realtime client  | **`@colyseus/sdk@^0.17`** (the 0.17 browser SDK — the older `colyseus.js` is frozen at 0.16 / schema v3 and is **not** wire-compatible with a 0.17 server) |
| REST + auth      | `express@^4`, `jsonwebtoken`, `bcryptjs` |
| DB               | `mongodb` (native driver) → MongoDB Atlas |
| Bundler          | `esbuild` (bundles the reused engine into one `dist/index.cjs`) |

You'll need: a **Google Cloud project** with Cloud Run + Artifact Registry (or
Container Registry) enabled and the `gcloud` CLI installed; a **MongoDB Atlas**
cluster + connection string; and the **Vercel** project for the frontend.

## Architecture

```
apps/web (Vercel, existing)  ──REST──▶  /auth/*        (JWT)
        │                    ──WS────▶  Colyseus GameRoom
        ▼
  shared/  (TypeScript contracts imported by BOTH web + server)
        ▲
  server/  (this package, Cloud Run)
        ├─ Express: /health, /auth/signup, /auth/login, /auth/me
        ├─ Colyseus GameRoom (JWT onAuth, seats, ready flow, reconnect)
        ├─ game/matchEngine.ts  ── reuses ../src/engine (deterministic rules)
        └─ MongoDB Atlas (users, matchHistory)
```

**Authority model.** The engine GameState lives in Colyseus room memory, never
in Mongo. Clients send *intents* (`GameAction`); the server validates and
executes them with the existing deterministic engine (`../src/engine`) and sends
each client a **per-seat-redacted** state (opponent's hidden cards blanked — see
"Hidden information" below). Client-owned game state is never trusted. The engine
is imported directly and bundled at build time — those modules are pure and
JSON-serializable, so they run unchanged under Node.

## Environment variables

Copy `.env.example` to `.env` for local dev; set the same keys in Cloud Run for
production. **Never commit secrets.**

| Var              | Required | Purpose |
|------------------|----------|---------|
| `PORT`           | no (Cloud Run injects) | Port to bind; defaults to 8080. |
| `NODE_ENV`       | no       | `development` \| `production`. |
| `MONGODB_URI`    | **yes**  | MongoDB Atlas connection string (include db name). |
| `JWT_SECRET`     | **yes**  | Secret for signing/verifying JWTs. Use `openssl rand -hex 32`. |
| `JWT_EXPIRES_IN` | no       | Token lifetime (default `7d`). |
| `CLIENT_ORIGIN`  | **yes**  | Allowed browser origin(s) for CORS + WS. Comma-separate for multiple. |

## Local development

```bash
cd server
cp .env.example .env          # fill in MONGODB_URI + JWT_SECRET
npm install
npm run dev                   # tsx watch, http://localhost:8080
```

Point the frontend at it (repo root `.env.local`):

```
VITE_API_BASE_URL=http://localhost:8080
VITE_COLYSEUS_URL=ws://localhost:8080
```

The frontend needs the 0.17 client SDK installed — from the **repo root**:

```bash
npm install                   # pulls @colyseus/sdk
npm run dev                   # Vite dev server, http://localhost:5173
```

Open the app: the sign-in / sign-up screen shows first. After signing in, go to
**Play → Casual** — the "Online Match" panel lists real backend rooms; create a
room (a shareable code is shown), and a second browser can join by that code.

`npm run typecheck` type-checks the server (including the reused engine).
`npm run build` bundles everything to `dist/index.cjs` with esbuild.

## Deploy to Google Cloud Run

### 0. Build context — read this first

The Docker build **must use the repo root as context** (the `.` at the end),
because the server bundles the shared engine from `../src` and `../shared`:

```bash
docker build -f server/Dockerfile -t optcg-server .     # note the trailing "."
```

Because the context is the repo root, Docker reads **`.dockerignore` from the
repo root** (already committed). That file excludes `dist/`, `public/` card
images, `scrape/`, `node_modules/`, and `.git/` — ~2.5 GB that the backend image
doesn't need. **Without it the build hangs on "transferring context"** while it
uploads the whole repo. If you ever see that hang, confirm the root
`.dockerignore` exists. The final image is still backend-only (esbuild inlines
`server/src` + `src/engine` + `shared` into one `dist/index.cjs`).

### 1. Build & push the image

Use Artifact Registry (Container Registry / `gcr.io` still works but is
deprecated). One-time registry setup:

```bash
gcloud artifacts repositories create optcg \
  --repository-format=docker --location=YOUR_REGION
gcloud auth configure-docker YOUR_REGION-docker.pkg.dev
```

Then either let Cloud Build do it, or build locally — **both from the repo root**:

```bash
IMAGE=YOUR_REGION-docker.pkg.dev/PROJECT_ID/optcg/optcg-server

# Option A — Cloud Build, no local Docker daemon needed (great on Windows).
# Uses cloudbuild.yaml at the repo root (which points at server/Dockerfile);
# upload size is trimmed by .gcloudignore.
gcloud builds submit --config cloudbuild.yaml --substitutions=_IMAGE="$IMAGE" .

# Option B — build locally, then push (requires Docker Desktop running):
docker build -f server/Dockerfile -t "$IMAGE" .
docker push "$IMAGE"
```

> `gcloud builds submit --tag ... -f server/Dockerfile` does **not** work —
> `--tag` mode only looks for a `Dockerfile` at the context root and has no `-f`
> flag. Use the `--config cloudbuild.yaml` form above for a non-root Dockerfile.

### 2. Deploy the service

Inject env vars (for real deployments keep `JWT_SECRET`/`MONGODB_URI` in Secret
Manager and reference them with `--set-secrets` instead of `--set-env-vars`).
Set `CLIENT_ORIGIN` to your Vercel domain so CORS + the WS origin check allow it:

```bash
gcloud run deploy optcg-server \
  --image "$IMAGE" \
  --region YOUR_REGION \
  --allow-unauthenticated \
  --port 8080 \
  --timeout 3600 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/optcg" \
  --set-env-vars JWT_SECRET="$(openssl rand -hex 32)" \
  --set-env-vars CLIENT_ORIGIN="https://your-app.vercel.app"
```

The command prints a **Service URL** like
`https://optcg-server-abc123-uc.a.run.app`. That's your backend origin — you'll
plug it into Vercel next.

### 3. Verify

```bash
curl https://optcg-server-abc123-uc.a.run.app/health   # -> {"status":"ok",...}
```

### WebSocket support on Cloud Run

Cloud Run supports WebSockets out of the box; no extra flag is needed. Two
things to know:

- Colyseus attaches to the **same** HTTP server, so a single Cloud Run service
  serves both REST and WS on one port — good, since Cloud Run exposes one port.
- Requests (incl. WS connections) have a **timeout** (default 5 min, max 60).
  Raise it for long matches: `--timeout=3600`. Also consider
  `--min-instances=1` to avoid cold starts dropping idle rooms, and note that
  Cloud Run may run multiple instances — this build keeps match state in a
  single room instance (no cross-instance room sharing); with `max-instances`
  > 1, use session affinity (`--session-affinity`) so a room's players land on
  the same instance.

### MongoDB Atlas

Allow Cloud Run egress to Atlas: either add `0.0.0.0/0` to the Atlas IP access
list (simplest) or configure a VPC connector + Atlas private endpoint for
production hardening.

## Vercel (frontend) env

Set these in the Vercel project (Settings → Environment Variables, Production +
Preview), using the Cloud Run **Service URL** from deploy step 2. Note the
`wss://` scheme (secure WebSocket) for the Colyseus URL. They are **public**
build-time vars — never put backend secrets here:

```
VITE_API_BASE_URL=https://optcg-server-abc123-uc.a.run.app
VITE_COLYSEUS_URL=wss://optcg-server-abc123-uc.a.run.app
```

Then **redeploy the frontend** (Vercel bakes env vars at build time, so a new
deploy is required for them to take effect).

Ordering tip — the two sides reference each other: deploy the backend first with
a best-guess `CLIENT_ORIGIN` (your known Vercel production domain), set the
Vercel env to the resulting Cloud Run URL and redeploy, and if your Vercel domain
changes, update `CLIENT_ORIGIN` on the Cloud Run service
(`gcloud run services update optcg-server --update-env-vars CLIENT_ORIGIN=...`).

If `VITE_API_BASE_URL` is unset, online multiplayer is simply disabled and the
UI says so — local + Casual-offline still work.

## Auth API

| Method | Path            | Body / Auth | Returns |
|--------|-----------------|-------------|---------|
| POST   | `/auth/signup`  | `{ email, username, password }` | `{ token, user }` |
| POST   | `/auth/login`   | `{ email, password }` | `{ token, user }` |
| GET    | `/auth/me`      | `Authorization: Bearer <jwt>` | `{ user }` |
| GET    | `/health`       | —           | `{ status: "ok" }` |

Passwords are hashed with bcrypt; hashes are never returned. Logout is
client-side (drop the token) — there is no server session.

## Hidden information (implemented)

The server holds the full authoritative `GameState` but sends each client a
copy **redacted for that seat** (`server/src/game/redaction.ts`), delivered as a
per-seat `state` message (not via shared Colyseus room state, which is identical
for everyone and so can't hold secrets):

- Opponent **hand**, both **decks**, and face-down **life** cards have their
  identity blanked (`cardDefinitionId → "__HIDDEN__"`) — so a modified client
  literally never receives them and can't reveal them on hover.
- **Log** lines are filtered with the engine's own `GameLogEntry.visibility`, so
  secret entries (private draws, peeks) never reach the other seat.

This reuses the engine's existing visibility model (`Zone.visibility`,
`CardInstance.revealedTo` / `faceState`, `GameLogEntry.visibility`) — no new
rules were invented. Hand *size* stays visible (public information).

## Known limitations / next steps

- **Board rendering online.** The server streams the per-seat-redacted
  `GameState` + logs; the Casual "Online Match" panel shows connection status,
  room code, seats/ready, and live turn/phase. Rendering that state through the
  full `MatchScreen` board (route each intent through `onlineStore.sendIntent`,
  render `onlineStore.gameState`) is the next step. It also needs the client to
  receive card **definitions** for the cards it *can* see (names/images/text),
  since the redacted state carries ids, not defs — deliver a defs subset
  alongside the first `state` message. Store plumbing is in place
  (`src/app/store/onlineStore.ts`).
- **PendingChoice redaction.** Card *identities* are already hidden; a follow-up
  can also scrub any `PendingChoice` payloads that reference secret cards.
- **Single-instance rooms.** See the session-affinity note above for scaling
  past one Cloud Run instance.
