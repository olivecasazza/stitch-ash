// GET /api/waitlist — operator-only inspection endpoint.
// Returns up to 200 newest waitlist entries.
// Gated by shared-secret header X-Waitlist-Token (matches env.WAITLIST_TOKEN).
// Set the secret in production via:
//   wrangler pages secret put WAITLIST_TOKEN

interface Env {
  STITCH_WAITLIST: KVNamespace;
  WAITLIST_TOKEN?: string;
}

interface Entry {
  key: string;
  sku: string;
  name: string;
  email: string;
  ts: string;
  ua: string;
  country: string;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

// Constant-time string compare to keep timing-attack surface low.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const expected = env.WAITLIST_TOKEN;
  if (!expected) {
    // Refuse to operate without a token configured — better than wide-open.
    return json(503, { ok: false, error: "endpoint_disabled" });
  }
  const provided = request.headers.get("x-waitlist-token") ?? "";
  if (!safeEqual(provided, expected)) {
    return json(401, { ok: false, error: "unauthorized" });
  }

  // KV `list` is eventually consistent and paginated; for ≤200 entries one page is enough.
  // Keys are `waitlist:<isoTs>:<email>` which sort ascending lexicographically — newest LAST.
  // We page through (up to a reasonable cap) then reverse.
  const collected: { name: string }[] = [];
  let cursor: string | undefined;
  const HARD_PAGE_CAP = 5; // 5 * 1000 = 5k keys max; we only return last 200 anyway
  for (let page = 0; page < HARD_PAGE_CAP; page++) {
    const result = await env.STITCH_WAITLIST.list({ prefix: "waitlist:", cursor });
    for (const k of result.keys) collected.push({ name: k.name });
    if (result.list_complete) break;
    cursor = result.cursor;
  }

  // Newest first
  collected.reverse();
  const slice = collected.slice(0, 200);

  // Fetch values in parallel (small N)
  const entries: Entry[] = [];
  await Promise.all(
    slice.map(async ({ name }) => {
      const raw = await env.STITCH_WAITLIST.get(name);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as Omit<Entry, "key">;
        entries.push({ key: name, ...parsed });
      } catch {
        /* skip malformed */
      }
    }),
  );

  // Re-sort by ts desc (parallel get can reorder)
  entries.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));

  return json(200, { ok: true, count: entries.length, entries });
};

// Reject other methods
export const onRequest: PagesFunction<Env> = async ({ request }) => {
  if (request.method === "GET") return json(500, { ok: false, error: "dispatch_error" });
  return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
    status: 405,
    headers: { "content-type": "application/json", allow: "GET" },
  });
};
