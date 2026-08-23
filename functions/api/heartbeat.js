// POST /api/heartbeat
// Body: { sessionId: "abc123", path: "about" }
// Writes presence:<sessionId> = { path, ts } with a TTL so it naturally
// expires shortly after the last heartbeat (tab closed / idle).
//
// TTL is intentionally longer than the heartbeat interval (15s) to give
// Cloudflare KV's cross-region propagation (~up to 60s) enough headroom —
// otherwise a key can expire before every edge location has even seen it,
// making presence flicker to 0 even while heartbeats are actively firing.

export async function onRequestPost(context) {
  const { request, env } = context;
  const kv = env.STATS;

  let body = {};
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const sessionId = (body.sessionId || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40);
  const path = (body.path || "unknown").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || "unknown";

  if (!sessionId) {
    return new Response(JSON.stringify({ ok: false, error: "missing sessionId" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  await kv.put(
    `presence:${sessionId}`,
    JSON.stringify({ path, ts: Date.now() }),
    { expirationTtl: 90 } // seconds — gives KV propagation lag enough room
  );

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
}
