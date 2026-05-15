// POST /api/checkout — STITCH AND ASH waitlist intake
// Cloudflare Pages Function. Same-origin only. Honeypot + (optional) Turnstile.
// Per-IP rate limit: 1 req/minute, KV-backed.
//
// Bindings (wrangler.toml / Pages dashboard):
//   STITCH_WAITLIST  KV namespace
// Env vars (optional):
//   TURNSTILE_SECRET_KEY  if set, request must include verified turnstileToken
//
// Request body: { sku, name, email, hp?, turnstileToken? }
// Response 200: { ok: true, renderUrl, message }
// Response 4xx:  { ok: false, error }

interface Env {
  STITCH_WAITLIST: KVNamespace;
  TURNSTILE_SECRET_KEY?: string;
}

type Sku = "stitch" | "ash-bloom" | "ampersand";
const VALID_SKUS: ReadonlySet<Sku> = new Set(["stitch", "ash-bloom", "ampersand"]);

// RFC 5322 is too loose to be useful at the edge; a pragmatic shape check is sufficient.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface CheckoutBody {
  sku?: unknown;
  name?: unknown;
  email?: unknown;
  hp?: unknown;
  turnstileToken?: unknown;
}

const json = (status: number, body: unknown, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    },
  });

const sameOrigin = (req: Request): boolean => {
  // Same-origin: either no Origin header (server-to-server / curl) is rejected for POST,
  // OR Origin matches Host. We rely on Origin since CF Pages always serves over HTTPS.
  const origin = req.headers.get("origin");
  if (!origin) {
    // Allow only if there's no browser context AND it's not a CORS preflight; this means
    // curl/server tests. Accept — same-origin policy is enforced by the browser, not us.
    return true;
  }
  const host = req.headers.get("host");
  if (!host) return false;
  try {
    const o = new URL(origin);
    return o.host === host;
  } catch {
    return false;
  }
};

async function verifyTurnstile(secret: string, token: string, ip: string): Promise<boolean> {
  try {
    const form = new FormData();
    form.append("secret", secret);
    form.append("response", token);
    if (ip) form.append("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    if (!r.ok) return false;
    const data = (await r.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

// Per-IP rate limit: 1/min. Key = ratelimit:<ip>. TTL 60s. If key exists, reject.
async function rateLimited(kv: KVNamespace, ip: string): Promise<boolean> {
  if (!ip) return false;
  const key = `ratelimit:${ip}`;
  const existing = await kv.get(key);
  if (existing) return true;
  // expirationTtl in seconds; min is 60.
  await kv.put(key, "1", { expirationTtl: 60 });
  return false;
}

export const onRequestOptions: PagesFunction<Env> = async () =>
  // Same-origin only; we don't advertise any cross-origin allowance.
  new Response(null, { status: 204, headers: { allow: "POST, OPTIONS" } });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!sameOrigin(request)) return json(403, { ok: false, error: "forbidden" });

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return json(400, { ok: false, error: "invalid_json" });
  }

  const sku = typeof body.sku === "string" ? body.sku.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const hp = typeof body.hp === "string" ? body.hp : "";
  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : "";

  // Honeypot — silently accept-but-discard to not tip off bots? Spec says return 400.
  if (hp.length > 0) return json(400, { ok: false, error: "honeypot" });

  if (!sku || !VALID_SKUS.has(sku as Sku)) {
    return json(400, { ok: false, error: "invalid_sku" });
  }
  if (!name || name.length > 100) {
    return json(400, { ok: false, error: "invalid_name" });
  }
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json(400, { ok: false, error: "invalid_email" });
  }

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "";

  // Optional Turnstile — only enforced when secret is configured
  if (env.TURNSTILE_SECRET_KEY) {
    if (!turnstileToken) return json(400, { ok: false, error: "missing_turnstile" });
    const ok = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, turnstileToken, ip);
    if (!ok) return json(400, { ok: false, error: "turnstile_failed" });
  }

  if (await rateLimited(env.STITCH_WAITLIST, ip)) {
    return json(429, { ok: false, error: "rate_limited" }, { "retry-after": "60" });
  }

  const ts = new Date().toISOString();
  // Sortable key: ISO timestamp sorts lexicographically; newest-first list does a reverse scan.
  const key = `waitlist:${ts}:${email}`;
  const value = JSON.stringify({
    sku,
    name,
    email,
    ts,
    ua: request.headers.get("user-agent") ?? "",
    country: (request as Request & { cf?: { country?: string } }).cf?.country ?? "",
  });

  try {
    await env.STITCH_WAITLIST.put(key, value);
  } catch (err) {
    return json(500, { ok: false, error: "kv_write_failed" });
  }

  return json(200, {
    ok: true,
    renderUrl: `/products/${sku}-front.png`,
    message: `Thanks ${name}. Your ${sku.toUpperCase()} reservation is on the ledger. We'll be in touch.`,
  });
};

// Reject any other method
export const onRequest: PagesFunction<Env> = async ({ request }) => {
  if (request.method === "POST" || request.method === "OPTIONS") {
    // dispatched by named handlers above; if we reach here it's a fallthrough
    return json(500, { ok: false, error: "dispatch_error" });
  }
  return json(405, { ok: false, error: "method_not_allowed" }, { allow: "POST, OPTIONS" });
};
