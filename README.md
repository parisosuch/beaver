# Beaver

An event tracking and logging dashboard built with Astro, React, and SQLite.

## Prerequisites

- [Bun](https://bun.sh/) (v1.0 or later)

## Installation

1. Clone the repository and install dependencies:

```sh
bun install
```

2. Initialize the database with seed data (optional):

```sh
bun run seed
```

This creates sample users, projects, channels, and events:
- Admin user: `admin` / `admin123`
- Demo user: `demo` / `demo123`

## Development

Start the local development server:

```sh
bunx --bun astro dev
```

The app will be available at `http://localhost:4321`.

## Production

### Build

```sh
bunx --bun astro build
```

### Run

```sh
bun ./dist/server/entry.mjs
```

### Environment Variables

| Variable | Description | Default |
| :------- | :---------- | :------ |
| `JWT_SECRET` | Secret key for signing JWT tokens | `beaver-default-secret-change-in-production` |
| `PORT` | Server port | `4321` |
| `HOST` | Server host | `localhost` |

For production, set a secure `JWT_SECRET`:

```sh
JWT_SECRET="your-secure-secret-key" node ./dist/server/entry.mjs
```

## Database

Beaver uses SQLite with Drizzle ORM. The database file (`beaver.sqlite`) is created automatically in the project root.

## Commands

| Command | Action |
| :------ | :----- |
| `bun install` | Install dependencies |
| `bun run dev` | Start dev server at `localhost:4321` |
| `bun run build` | Build for production to `./dist/` |
| `bun run preview` | Preview production build locally |
| `bun run seed` | Seed database with sample data |
| `bun run format` | Format code with Prettier |
