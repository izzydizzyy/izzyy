// GET /api/stats
// Returns: { totalViews, pages: [{name, count}], devices: [...], referrers: [...] }

async function readPrefixed(kv, prefix) {
  const list = await kv.list({ prefix });
  const out = [];
  for (const key of list.keys) {
    const value = await kv.get(key.name);
    out.push({
      name: key.name.slice(prefix.length),
      count: parseInt(value || "0", 10) || 0,
    });
  }
  return out.sort((a, b) => b.count - a.count);
}

export async function onRequestGet(context) {
  const { env } = context;
  const kv = env.STATS;

  const [totalViewsRaw, pages, devices, referrers] = await Promise.all([
    kv.get("total:views"),
    readPrefixed(kv, "page:"),
    readPrefixed(kv, "device:"),
    readPrefixed(kv, "ref:"),
  ]);

  return new Response(
    JSON.stringify({
      totalViews: parseInt(totalViewsRaw || "0", 10) || 0,
      pages,
      devices,
      referrers,
    }),
    { headers: { "content-type": "application/json" } }
  );
}
