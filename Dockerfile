FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# Build the application
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Production image
FROM base AS runtime
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/src/lib/db/migrate.ts ./src/lib/db/migrate.ts

ENV HOST=0.0.0.0
ENV PORT=4321

EXPOSE 4321

CMD ["sh", "-c", "bun src/lib/db/migrate.ts && bun ./dist/server/entry.mjs"]
