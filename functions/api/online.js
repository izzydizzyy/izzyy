// GET /api/online
// Returns: { count, visitors: [{ path, since }] }
// Reads every presence:* key still alive in KV (expired ones are gone
// automatically thanks to the TTL set in heartbeat.js).

export async function onRequestGet(context) {
  const { env } = context;
  const kv = env.STATS;

  const list = await kv.list({ prefix: "presence:" });

  const visitors = [];
  for (const key of list.keys) {
    const raw = await kv.get(key.name);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      visitors.push({ path: parsed.path, since: parsed.ts });
    } catch {
      // skip malformed entries
    }
  }

  return new Response(
    JSON.stringify({ count: visitors.length, visitors }),
    { headers: { "content-type": "application/json" } }
  );
}
