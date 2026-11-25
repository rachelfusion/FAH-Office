import { verify } from './token.js';

export function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(data));
}

export function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader('location', location);
  res.end();
}

export function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function setCookie(res, name, value, { maxAge } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax', 'Secure', 'HttpOnly'];
  if (maxAge != null) parts.push(`Max-Age=${maxAge}`);
  const prev = res.getHeader('set-cookie');
  res.setHeader('set-cookie', [...(prev ? [].concat(prev) : []), parts.join('; ')]);
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return JSON.parse(raw || '{}');
}

export const crewIds = () => (process.env.CREW_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);

export function publicUrl(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return (process.env.PUBLIC_URL || `https://${host}`).replace(/\/$/, '');
}

// The logged-in Discord user, or null.
export function getSession(req) {
  return verify(cookies(req).fah_session, process.env.SESSION_SECRET);
}

export function getCrewSession(req) {
  const s = getSession(req);
  return s && crewIds().includes(s.uid) ? s : null;
}
