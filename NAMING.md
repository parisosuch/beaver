# Event Naming Convention

All Beaver events use the `object.action` convention. Pick the name once and never think about it again.

## Format

```
object.action
```

- Lowercase only
- Letters and underscores only (within each segment)
- Must start with a letter
- Exactly one `.` separator, exactly two segments
- Regex: `/^[a-z][a-z_]*\.[a-z][a-z_]*$/`

## Conventions

**Object — singular noun.** The thing the event happened to.

| ✅        | ❌                      |
| --------- | ----------------------- |
| `user`    | `users`                 |
| `server`  | `servers`               |
| `payment` | `payments`              |
| `deploy`  | `deploys`, `deployment` |
| `channel` | `chans`                 |

**Action — past-tense verb.** What happened to it.

| ✅               | ❌                        |
| ---------------- | ------------------------- |
| `signed_up`      | `signup`, `signing_up`    |
| `failed`         | `fail`, `failure`         |
| `completed`      | `complete`, `done`        |
| `created`        | `create`, `new`           |
| `deleted`        | `delete`, `remove`        |
| `status_changed` | `status`, `change_status` |

## Examples

```
user.signed_up
user.deleted
payment.completed
payment.failed
server.status_changed
deploy.completed
deploy.failed
session.started
feature.used
```

## Reserved

`legacy` is reserved as an `event_object`. It is the bucket for events migrated from before this convention existed and cannot be used for new events. Sending `legacy.anything` to `POST /api/event` returns a `400`.

## Renaming

Typos happen. Use the CLI helpers to fix them in place:

```bash
bun run rename-event-object usre user
bun run rename-event-action signup signed_up
bun run rename-event-action failed errored --object payment
```

Both commands run a single `UPDATE` against the events table. No downtime, no migration.
