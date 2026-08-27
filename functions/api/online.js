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
    } catch {}
  }
  return new Response(
    JSON.stringify({ count: visitors.length, visitors }),
    { headers: { "content-type": "application/json" } }
  );
}
