// Short-lived signed tokens. The website (web/api/live-token.js) signs one for a
// logged-in crew member; the bot checks it before letting a browser connect.
// Both sides must share the same LIVE_SECRET. Keep this file identical to
// web/api/_lib/token.js.
import crypto from 'node:crypto';

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const mac = (body, secret) => crypto.createHmac('sha256', secret).update(body).digest('base64url');

export function sign(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${mac(body, secret)}`;
}

export function verify(token, secret) {
  if (typeof token !== 'string' || !secret) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(mac(body, secret));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return null; }
  if (!payload || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
  return payload;
}
