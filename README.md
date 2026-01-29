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

## API Usage

### Posting Events

Send a `POST` request to `/api/event` to log events from your application.

**Endpoint:** `POST /api/event`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
| :---- | :--- | :------- | :---------- |
| `name` | string | Yes | Event name (e.g., "User Signup") |
| `channel` | string | Yes | Channel name to post to |
| `apiKey` | string | Yes | Your project's API key |
| `description` | string | No | Additional details about the event |
| `icon` | string | No | Emoji icon for the event |
| `tags` | object | No | Key-value metadata (string, number, or boolean values) |

**Example with curl:**

```sh
curl -X POST http://localhost:4321/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Sale",
    "channel": "sales",
    "apiKey": "your-project-api-key",
    "description": "Customer completed a purchase",
    "icon": "💰",
    "tags": {
      "amount": 99.99,
      "currency": "USD",
      "customer_id": "cust_123"
    }
  }'
```

**Example with JavaScript:**

```js
await fetch("http://localhost:4321/api/event", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "User Signup",
    channel: "signups",
    apiKey: "your-project-api-key",
    description: "New user registered",
    icon: "👤",
    tags: {
      method: "google",
      referrer: "organic",
    },
  }),
});
```

**Response:**

```json
{
  "id": 1,
  "name": "New Sale",
  "description": "Customer completed a purchase",
  "icon": "💰",
  "projectId": 1,
  "channelName": "sales",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "tags": {
    "amount": 99.99,
    "currency": "USD",
    "customer_id": "cust_123"
  }
}
```

You can find your project's API key in the project settings page.

## Commands

| Command | Action |
| :------ | :----- |
| `bun install` | Install dependencies |
| `bun run dev` | Start dev server at `localhost:4321` |
| `bun run build` | Build for production to `./dist/` |
| `bun run preview` | Preview production build locally |
| `bun run seed` | Seed database with sample data |
| `bun run format` | Format code with Prettier |
