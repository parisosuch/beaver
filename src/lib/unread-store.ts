// Last dispatched unread counts, shared between the poller island and whatever
// renders the badges. Islands hydrate independently — the poller is client:load
// and the sidebar is client:idle — so the poller's first dispatch usually lands
// before the sidebar has attached its `unread:updated` listener. Recording the
// counts here lets a late subscriber read them on mount instead of waiting for
// the next dispatch (an SSE event or the 60s resync).

let latest: Record<number, number> = {};

export function recordUnreadCounts(counts: Record<number, number>) {
  latest = counts;
}

export function readUnreadCounts(): Record<number, number> {
  return latest;
}
