FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y python3 make g++
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build the application
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Production image
FROM base AS runtime
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

ENV HOST=0.0.0.0
ENV PORT=4321

EXPOSE 4321

CMD ["bun", "./dist/server/entry.mjs"]
