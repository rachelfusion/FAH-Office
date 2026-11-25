// GET: everyone's saved character looks. PUT: save your own.
import { getCrewSession, json, readJson } from './_lib/http.js';
import { cleanLook } from './_lib/looks.js';
import { redis, redisEnabled } from './_lib/redis.js';

const KEY = 'fah:looks';

export default async function handler(req, res) {
  const s = getCrewSession(req);
  if (!s) return json(res, 401, { error: 'Log in with a Discord account that is on the crew list.' });
  if (!redisEnabled()) return json(res, 501, { error: 'Saving looks is not set up yet. Add Upstash Redis to the Vercel project.' });

  try {
    if (req.method === 'GET') {
      const flat = (await redis(['HGETALL', KEY])) || [];
      const looks = {};
      for (let i = 0; i < flat.length; i += 2) {
        try { looks[flat[i]] = JSON.parse(flat[i + 1]); } catch { /* skip broken entry */ }
      }
      return json(res, 200, { looks });
    }
    if (req.method === 'PUT') {
      const look = cleanLook(await readJson(req).catch(() => null));
      if (!look) return json(res, 400, { error: 'That look has an option the office does not know.' });
      await redis(['HSET', KEY, s.uid, JSON.stringify(look)]);
      return json(res, 200, { ok: true, look });
    }
    res.setHeader('allow', 'GET, PUT');
    return json(res, 405, { error: 'Use GET or PUT.' });
  } catch (e) {
    return json(res, 502, { error: `Could not reach the looks database: ${e.message}` });
  }
}
