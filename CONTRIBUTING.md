# Contributing to Beaver

## Tech Stack

- **Runtime:** [Bun](https://bun.sh/)
- **Framework:** [Astro](https://astro.build/) v5 with SSR (`output: "server"`) and the `@astrojs/node` adapter
- **UI:** [React](https://react.dev/) v19 (via `@astrojs/react`), [Tailwind CSS](https://tailwindcss.com/) v4, [Radix UI](https://www.radix-ui.com/) primitives, [Framer Motion](https://motion.dev/), [Lucide React](https://lucide.dev/) icons
- **Database:** SQLite via `bun:sqlite` + [Drizzle ORM](https://orm.drizzle.team/)
- **Auth:** JWT (via [jose](https://github.com/panva/jose)) with refresh tokens stored in cookies and sessions persisted in the database
- **PWA:** `@vite-pwa/astro` with iOS-specific meta tags and safe-area insets

## Getting Started

```sh
bun install
bun run migrate             # apply database migrations
bun run seed                # optional — creates admin user (admin/admin123) and sample data
bun run dev                 # starts dev server at http://localhost:4321
```

## Project Structure

```
src/
├── components/       # React components (interactive islands)
├── layouts/          # Astro layouts (layout.astro wraps all dashboard pages)
├── lib/
│   ├── auth/         # JWT signing/verification, session management
│   ├── beaver/       # Domain logic — channel, event, project, user, tag queries
│   └── db/
│       ├── schema.ts  # Drizzle schema (projects, channels, events, eventTags, users, sessions)
│       ├── db.ts      # Database connection
│       ├── migrate.ts # Migration runner (run with `bun run migrate`)
│       └── seed.ts    # Seed script
├── middleware.ts     # Auth middleware, DB init, public route allowlisting
├── pages/
│   ├── api/          # API routes (auth, events, channels, projects, tags)
│   ├── dashboard/    # Dashboard pages (Astro files)
│   ├── login.astro
│   └── onboarding.astro
└── styles/
    └── global.css    # Tailwind imports
```

## Database

The SQLite database file is created automatically at `data/beaver.sqlite`. The schema is defined in `src/lib/db/schema.ts` with Drizzle ORM. Migration files live in `drizzle/`.

**Tables:** `projects`, `channel_groups`, `channels`, `events`, `event_tags`, `channel_reads`, `bookmarks`, `users`, `sessions`, `project_members`, `metrics`, `metric_values`

All tables use integer primary keys with auto-increment. Timestamps are stored as milliseconds since epoch (`mode: "timestamp_ms"`). Cascade deletes are configured on foreign keys.

**Running migrations:**

```sh
bun run migrate
```

**Adding a migration after a schema change:**

```sh
bun drizzle-kit generate   # generates a new SQL file in drizzle/
bun run migrate            # applies it
```

Migrations run automatically on container startup in Docker.

## Architecture Notes

### Astro Islands

Astro pages (`.astro` files) handle routing and server-side data fetching. React components are hydrated as interactive islands using `client:load`. The side panel persists across navigations via `transition:persist`.

### Authentication Flow

1. Middleware (`src/middleware.ts`) runs on every request
2. Public routes (`/login`, `/onboarding`, `/api/auth/*`, `/api/event`) skip auth
3. Protected routes check for a `refresh_token` cookie, verify the JWT, and validate the session in the database
4. If no admin user exists, all routes redirect to `/onboarding`

### Real-Time Updates

Event feeds use Server-Sent Events (SSE) for real-time streaming. SSE endpoints exist per channel (`/api/events/channel/:id/event-stream`) and per project (`/api/events/project/:id/event-stream`). Each endpoint polls the DB every 2s in a `while(true)` loop and sends new events to the client. SSE is only active for the default sort order (newest first).

### Metrics

Three metric types are supported:

- **gauge** — upserts a single current value (e.g. CPU usage)
- **counter** — append-only increment (e.g. request count)
- **timeseries** — append-only series with timestamps (e.g. response latency over time)

Metrics must be created in the dashboard before data can be ingested. Logic lives in `src/lib/beaver/metric.ts`; ingestion endpoint is `POST /api/metric`.

### Custom Events

Components communicate client-side via `window.dispatchEvent(new CustomEvent(...))`. Key events: `channel:updated`, `channel:created`, `channel:deleted`, `unread:updated`. Always subscribe in `useEffect` and remove the listener on unmount.

### API Authentication

External API calls (e.g., creating events) use the `X-API-Key` header with the project's API key. This is separate from the cookie-based user auth.

## Conventions

- **Formatting:** `bun run format` (oxfmt). A pre-commit hook enforces `format:check`, `lint`, and `tsc`.
- **Linting:** `bun run lint` (oxlint). Auto-fix with `bun run lint:fix`.
- **Type checking:** `bun run astro sync && bunx tsc --noEmit`
- **Commits:** Conventional commit format (`feat:`, `fix:`, `refactor:`, etc.). No issue references in commit messages — this is a squash-merge project; put issue refs in the PR body only.
- **Colors:** The project uses oklch via CSS variables. Never use `hsl(var(--chart-N))` — it's invalid. Use `var(--chart-N)` directly.
- **Responsive design:** Mobile-first with Tailwind breakpoints — default styles target mobile, `md:` for tablet, `lg:` for desktop.
- **Component patterns:** UI primitives live in `src/components/ui/` (shadcn/ui). Add new ones with `bunx shadcn@latest add <component>`. Feature components are at the top level of `src/components/`.
- **Database queries:** Domain logic goes in `src/lib/beaver/` (one file per entity). Raw Drizzle queries, not a repository pattern.
- **API routes:** Astro API routes in `src/pages/api/`. Use `APIRoute` type exports (`GET`, `POST`, etc.).
- **SSR hydration:** Any value that reads from `localStorage` or the DOM must be set inside `useEffect`, not computed during render.

## Building for Production

```sh
bun run build              # outputs to ./dist/
bun ./dist/server/entry.mjs  # run the production server
```

### Docker

```sh
docker build -t beaver .
docker run -p 4321:4321 --env-file .env -v beaver-data:/app/data beaver
```

The Dockerfile uses a multi-stage build (deps → build → runtime) with the `oven/bun:1` base image. Since the project uses `bun:sqlite` (built into Bun), no native compilation is required. Migrations run automatically at container startup before the server starts.

## Environment Variables

| Variable     | Description                   | Default                                      |
| :----------- | :---------------------------- | :------------------------------------------- |
| `JWT_SECRET` | Secret for signing JWT tokens | `beaver-default-secret-change-in-production` |
| `PORT`       | Server port                   | `4321`                                       |
| `HOST`       | Server host                   | `localhost`                                  |
