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

### Docker

1. Copy the example environment file and set a secure JWT secret:

```sh
cp .env.example .env
```

Generate a secret and add it to `.env`:

```sh
openssl rand -base64 32
```

2. Build and run:

```sh
docker build -t beaver .
docker run -p 4321:4321 --env-file .env -v beaver-data:/app/data beaver
```

The volume mount persists the SQLite database across container restarts.

### Environment Variables

| Variable | Description | Default |
| :------- | :---------- | :------ |
| `JWT_SECRET` | Secret key for signing JWT tokens | `beaver-default-secret-change-in-production` |
| `PORT` | Server port | `4321` |
| `HOST` | Server host | `localhost` |

For production, set a secure `JWT_SECRET`:

```sh
JWT_SECRET="your-secure-secret-key" bun ./dist/server/entry.mjs
```

## Database

Beaver uses SQLite with Drizzle ORM. The database file (`data/beaver.sqlite`) is created automatically in the `data/` directory.

## API Usage

### Authentication

All API requests require your project's API key, passed via the `X-API-Key` header. You can find your API key in the project settings page.

```
X-API-Key: your-project-api-key
```

### Create Event

Send a `POST` request to `/api/event` to log events from your application.

**Endpoint:** `POST /api/event`

**Headers:**

| Header | Required | Description |
| :----- | :------- | :---------- |
| `Content-Type` | Yes | Must be `application/json` |
| `X-API-Key` | Yes | Your project's API key |

**Request Body:**

| Field | Type | Required | Description |
| :---- | :--- | :------- | :---------- |
| `name` | string | Yes | Event name (e.g., "User Signup") |
| `channel` | string | Yes | Channel name to post to |
| `description` | string | No | Additional details about the event (searchable in the dashboard) |
| `icon` | string | No | Emoji icon for the event |
| `tags` | object | No | Key-value metadata (string, number, or boolean values) |

**Example with curl:**

```sh
curl -X POST http://localhost:4321/api/event \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-project-api-key" \
  -d '{
    "name": "New Sale",
    "channel": "sales",
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
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "your-project-api-key",
  },
  body: JSON.stringify({
    name: "User Signup",
    channel: "signups",
    description: "New user registered",
    icon: "👤",
    tags: {
      method: "google",
      referrer: "organic",
    },
  }),
});
```

**Success Response (200):**

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

**Error Responses:**

| Status | Description |
| :----- | :---------- |
| `401` | Missing `X-API-Key` header |
| `400` | Missing required field (`name` or `channel`) |
| `400` | Invalid `tags` format (not valid JSON) |
| `500` | Invalid API key or channel not found |

## Commands

| Command | Action |
| :------ | :----- |
| `bun install` | Install dependencies |
| `bun run dev` | Start dev server at `localhost:4321` |
| `bun run build` | Build for production to `./dist/` |
| `bun run preview` | Preview production build locally |
| `bun run seed` | Seed database with sample data |
| `bun run format` | Format code with Prettier |
