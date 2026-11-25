// A 5-minute pass that lets a crew member's browser connect to the bot.
import { getCrewSession, json } from './_lib/http.js';
import { sign } from './_lib/token.js';

export default function handler(req, res) {
  const s = getCrewSession(req);
  if (!s) return json(res, 401, { error: 'Log in with a Discord account that is on the crew list.' });
  if (!process.env.LIVE_SECRET) return json(res, 500, { error: 'LIVE_SECRET is not set in Vercel.' });
  json(res, 200, { token: sign({ uid: s.uid, exp: Date.now() + 5 * 60_000 }, process.env.LIVE_SECRET) });
}
