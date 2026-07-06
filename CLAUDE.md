# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev          # start dev server
bun run build        # production build (also type-checks via Astro)
bun run format       # format with oxfmt
bun run format:check # check formatting (used in pre-commit hook)
bun run lint         # lint with oxlint
bun run lint:fix     # auto-fix lint issues
bun run migrate      # run pending DB migrations
bun run seed         # seed DB with sample data
bun run reset-admin  # reset admin password
```

Type-check without building:

```bash
bun run astro sync && bunx tsc --noEmit
```

Always use `bun`/`bunx` — never `npm`/`npx`.

## Architecture

**Astro SSR + React islands.** Pages live in `src/pages/` and are server-rendered. Interactive UI is React components mounted with `client:load`. Routing uses Astro's ClientRouter (View Transitions) for SPA-like navigation — be aware that React state does not reset between navigations unless the component is keyed.

**Database.** SQLite at `data/beaver.sqlite` (WAL mode). ORM is Drizzle — schema in `src/lib/db/schema.ts`, queries in `src/lib/beaver/`. All schema changes require a migration via `bun run migrate` (uses drizzle-kit). Never write raw SQL for schema changes.

**Auth.** JWT access tokens + `refresh_token` session cookie, enforced in `src/middleware.ts`. Public routes are whitelisted there. `context.locals.user` is set for authenticated requests; check it in API routes before doing anything.

**Real-time.** Events stream via SSE from `src/pages/api/events/*/event-stream.ts`. These poll the DB every 2s in a `while(true)` loop and push new events to the client. The client-side hook is in `src/components/event-feed.tsx`.

**Metrics.** Three types — `gauge` (upsert single value), `counter` (increment-only), `timeseries` (append series). Logic in `src/lib/beaver/metric.ts`. Metrics must be created in the dashboard before they can be ingested via API.

**Custom events.** Components communicate via `window.dispatchEvent(new CustomEvent(...))`. Key events: `channel:updated`, `channel:created`, `channel:deleted`, `unread:updated`. Subscribe in `useEffect` and clean up on unmount.

## Conventions

**Colors.** The project uses oklch via CSS variables. Never use `hsl(var(--chart-N))` — it's invalid. Use `var(--chart-N)` directly, or pass `{ light: "...", dark: "..." }` to chart theme props.

**Commits.** Conventional commit format (`feat:`, `fix:`, `refactor:`, etc.). No issue references in commit messages — this is a squash-merge project, so issue refs go in the PR body only. Do not add co-author or attribution trailers (`Co-Authored-By`, `Generated with …`, session links) to commits or PR bodies.

**Releases.** Each release has a branch named `v<version>` (e.g. `v2.2.0`) cut from `main`; feature work for that release branches off it and PRs back into it. Shipping a release: bump `package.json` (only at release time, not in feature PRs), merge to `main`, then tag `v<version>` and publish a GitHub release with "## What's Changed" notes.

**shadcn/ui.** Components are in `src/components/ui/`. Add new ones with `bunx shadcn@latest add <component>`.

**SSR hydration.** Any value that reads from `localStorage` or the DOM must be set inside `useEffect`, not computed during render — the server has no access to browser APIs.

**Channel/username sanitization.** Channel names and usernames are sanitized at both the UI layer (live input) and the lib layer (before DB write). Pattern: replace invalid chars with `-`, collapse consecutive `-`.
