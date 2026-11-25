// Public settings the page needs at startup. Nothing secret in here.
import { json } from './_lib/http.js';
import { redisEnabled } from './_lib/redis.js';

export default function handler(req, res) {
  json(res, 200, {
    liveUrl: (process.env.BOT_LIVE_URL || '').replace(/\/$/, '') || null,
    login: Boolean(process.env.DISCORD_CLIENT_ID),
    looks: redisEnabled(),
  });
}
