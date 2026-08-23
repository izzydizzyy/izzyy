// POST /api/hit
// Body: { path: "about", device: "mobile" | "desktop" | "tablet", referrer: "direct" | "discord" | ... }
// Increments: total:views, page:<path>, device:<device>, ref:<referrer>

async function bump(kv, key) {
  const current = await kv.get(key);
  const next = (parseInt(current || "0", 10) || 0) + 1;
  await kv.put(key, String(next));
  return next;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const kv = env.STATS;

  let body = {};
  try {
    body = await request.json();
  } catch {
    // no body — still count a generic hit
  }

  const path = (body.path || "unknown").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || "unknown";
  const device = (body.device || "desktop").toLowerCase().replace(/[^a-z]/g, "").slice(0, 20) || "desktop";
  const referrer = (body.referrer || "direct").toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40) || "direct";

  const total = await bump(kv, "total:views");
  await bump(kv, `page:${path}`);
  await bump(kv, `device:${device}`);
  await bump(kv, `ref:${referrer}`);

  return new Response(JSON.stringify({ ok: true, total }), {
    headers: { "content-type": "application/json" },
  });
}
