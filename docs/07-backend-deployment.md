# Backend Deployment

This guide covers the Docker + Colyseus backend service from the
`feature/backend-colyseus-cloudrun` branch, adapted for this codebase.

The frontend remains a static Vercel app. The backend runs separately as a
Docker container on Google Cloud Run and provides:

- Express REST auth endpoints.
- Colyseus realtime match rooms.
- MongoDB Atlas persistence for users and match history.
- Authoritative game-state execution using the existing TypeScript engine.

## Prerequisites

- Node.js 20 or newer.
- Docker Desktop if building locally.
- Google Cloud project with Cloud Run and Artifact Registry enabled.
- `gcloud` CLI authenticated to the target project.
- MongoDB Atlas cluster and connection string.
- Vercel project for the frontend.

## Environment

For local backend development, copy the example file:

```bash
cd server
cp .env.example .env
```

Required production variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB Atlas connection string, including database name. |
| `JWT_SECRET` | yes | JWT signing secret. Use a long random value. |
| `CLIENT_ORIGIN` | yes | Allowed frontend origins for CORS and websocket checks. |
| `PORT` | no | Cloud Run injects this. Local default is `8080`. |
| `NODE_ENV` | no | Use `production` on Cloud Run. |
| `JWT_EXPIRES_IN` | no | Defaults to `7d`. |

For local frontend-to-backend wiring, set these in the repo root `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_COLYSEUS_URL=ws://localhost:8080
```

For Vercel production and preview, use the Cloud Run service URL:

```env
VITE_API_BASE_URL=https://YOUR_SERVICE_URL
VITE_COLYSEUS_URL=wss://YOUR_SERVICE_URL
```

Do not put backend secrets in Vercel. `VITE_*` values are public build-time
frontend variables.

## Local Development

Install and run the backend:

```bash
cd server
npm install
npm run dev
```

The backend listens on `http://localhost:8080` by default.

In another terminal, run the frontend from the repo root:

```bash
npm install
npm run dev
```

After sign-in, go to Play -> Casual. With `VITE_API_BASE_URL` configured, the
online match panel uses the real Colyseus backend instead of the offline mock
lobby.

## Build Context

Build the Docker image from the repo root, not from `server/`:

```bash
docker build -f server/Dockerfile -t optcg-server .
```

The trailing `.` matters. The server bundles code from both `server/` and shared
repo folders such as `src/engine` and `shared`.

The root `.dockerignore` is also important because the Docker context is the
whole repo. It excludes heavy local folders such as `node_modules`, `dist`,
public card images, scrape output, and `.git`. If Docker appears stuck on
"transferring context", check the root `.dockerignore`.

## Build And Push

Create an Artifact Registry repository once:

```bash
gcloud artifacts repositories create optcg \
  --repository-format=docker \
  --location=YOUR_REGION

gcloud auth configure-docker YOUR_REGION-docker.pkg.dev
```

Set the image path:

```bash
IMAGE=YOUR_REGION-docker.pkg.dev/PROJECT_ID/optcg/optcg-server
```

Option A, Cloud Build from the repo root:

```bash
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions=_IMAGE="$IMAGE" \
  .
```

Option B, local Docker build and push:

```bash
docker build -f server/Dockerfile -t "$IMAGE" .
docker push "$IMAGE"
```

Do not use `gcloud builds submit --tag ... -f server/Dockerfile`. The `--tag`
form expects a Dockerfile at the context root and does not support `-f`. Use the
checked-in `cloudbuild.yaml`.

## Deploy To Cloud Run

For a first deployment:

```bash
gcloud run deploy optcg-server \
  --image "$IMAGE" \
  --region YOUR_REGION \
  --allow-unauthenticated \
  --port 8080 \
  --timeout 3600 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/optcg" \
  --set-env-vars JWT_SECRET="replace-with-long-random-secret" \
  --set-env-vars CLIENT_ORIGIN="https://your-app.vercel.app"
```

For real production, prefer Secret Manager for `MONGODB_URI` and `JWT_SECRET`
instead of plain `--set-env-vars`.

Cloud Run prints a service URL after deploy. Use that URL in the frontend
environment variables:

```env
VITE_API_BASE_URL=https://optcg-server-abc123-uc.a.run.app
VITE_COLYSEUS_URL=wss://optcg-server-abc123-uc.a.run.app
```

Then redeploy the frontend, because Vercel bakes `VITE_*` variables at build
time.

## Verify

Health check:

```bash
curl https://YOUR_SERVICE_URL/health
```

Expected response:

```json
{ "status": "ok" }
```

Auth endpoints:

| Method | Path | Body / Auth |
| --- | --- | --- |
| `POST` | `/auth/signup` | `{ "email": "...", "username": "...", "password": "..." }` |
| `POST` | `/auth/login` | `{ "email": "...", "password": "..." }` |
| `GET` | `/auth/me` | `Authorization: Bearer <jwt>` |
| `GET` | `/health` | none |

End-to-end check:

1. Open the deployed frontend.
2. Sign up or log in.
3. Go to Play -> Casual.
4. Create an online room.
5. Open a second browser/session and join by room code.
6. Ready both players with saved decks.

## Cloud Run WebSockets

Cloud Run supports WebSockets without an extra flag. This backend attaches
Colyseus to the same HTTP server as Express, so REST and websocket traffic share
one Cloud Run port.

Use `--timeout 3600` for long matches. Consider `--min-instances=1` to reduce
cold starts.

This implementation stores live room state in memory. If you allow more than one
Cloud Run instance, enable session affinity so both players in a room keep
reaching the same instance:

```bash
gcloud run services update optcg-server \
  --region YOUR_REGION \
  --session-affinity
```

## MongoDB Atlas

Cloud Run must be allowed to reach Atlas.

For quick setup, add `0.0.0.0/0` to the Atlas IP access list. For hardened
production, use a VPC connector and Atlas private endpoint.

## Updating Origins

If the frontend domain changes, update `CLIENT_ORIGIN`:

```bash
gcloud run services update optcg-server \
  --region YOUR_REGION \
  --update-env-vars CLIENT_ORIGIN="https://your-new-app.vercel.app"
```

`CLIENT_ORIGIN` can be comma-separated if you need both production and preview
domains:

```bash
--update-env-vars CLIENT_ORIGIN="https://prod.vercel.app,https://preview.vercel.app"
```

## Known Limitations

- Online board rendering is still a follow-up. The backend streams redacted
  state and logs, and the online panel shows room/seating/ready state.
- Live match rooms are in memory. Scaling across multiple Cloud Run instances
  needs session affinity or a Colyseus scaling adapter.
- Pending-choice payload redaction can be tightened further. Card identities are
  redacted in the streamed state, but secret-card references inside future
  choice payloads should be reviewed as online board rendering expands.
