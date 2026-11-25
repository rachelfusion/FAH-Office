// Tiny Upstash Redis client over its REST API (no extra packages).
// Add "Upstash for Redis" from the Vercel Marketplace and these env vars appear.
const conf = () => ({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

export const redisEnabled = () => {
  const { url, token } = conf();
  return Boolean(url && token);
};

export async function redis(command) {
  const { url, token } = conf();
  const r = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(command),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) throw new Error(body.error || `Redis returned ${r.status}`);
  return body.result;
}
