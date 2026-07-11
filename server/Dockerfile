# Backend container for Google Cloud Run.
#
# IMPORTANT: build with the REPO ROOT as context, because the server bundles
# the shared engine from ../src and ../shared at build time:
#
#   docker build -f server/Dockerfile -t optcg-server .
#
# esbuild inlines all of our own TypeScript (server/src + src/engine +
# src/cards + shared) into dist/index.cjs, so the runtime image needs only the
# production npm packages — not the root source tree.

# ---- build stage -----------------------------------------------------------
FROM node:20-slim AS build
WORKDIR /app

# git + CA certs: node:20-slim ships neither, and some transitive npm packages
# may resolve from a git URL during install. Installing git here (build stage
# only) avoids the "npm error syscall spawn git / ENOENT" failure.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install deps first (better layer caching) using only the manifest.
COPY server/package.json ./server/package.json
RUN cd server && npm install

# Bring in the sources the bundle needs, then build.
COPY shared ./shared
COPY src ./src
COPY server ./server
RUN cd server && npm run build

# Drop dev dependencies so the node_modules we carry into runtime is prod-only.
RUN cd server && npm prune --omit=dev

# ---- runtime stage ---------------------------------------------------------
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/server

# No npm install here: reuse the bundled entrypoint + the pruned production
# node_modules from the build stage. Keeps the runtime image lean and means the
# runtime never needs git or network access.
COPY --from=build /app/server/package.json ./package.json
COPY --from=build /app/server/node_modules ./node_modules
COPY --from=build /app/server/dist ./dist

# Cloud Run injects PORT (default 8080); the app binds 0.0.0.0.
EXPOSE 8080
CMD ["node", "dist/index.cjs"]
