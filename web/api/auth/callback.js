// Discord sends you back here after login. We swap the code for your profile
// and keep it in a signed cookie for 30 days.
import { cookies, publicUrl, redirect, setCookie } from '../_lib/http.js';
import { sign } from '../_lib/token.js';

const DAY = 86_400;

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state || state !== cookies(req).fah_oauth) return redirect(res, '/?login=failed');
  if (!process.env.SESSION_SECRET) return redirect(res, '/?login=misconfigured');

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${publicUrl(req)}/api/auth/callback`,
      }),
    });
    if (!tokenRes.ok) return redirect(res, '/?login=failed');
    const { access_token: accessToken } = await tokenRes.json();

    const userRes = await fetch('https://discord.com/api/users/@me', { headers: { authorization: `Bearer ${accessToken}` } });
    if (!userRes.ok) return redirect(res, '/?login=failed');
    const u = await userRes.json();

    const session = sign({
      uid: u.id,
      name: u.global_name || u.username,
      avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64` : null,
      exp: Date.now() + 30 * DAY * 1000,
    }, process.env.SESSION_SECRET);

    setCookie(res, 'fah_session', session, { maxAge: 30 * DAY });
    setCookie(res, 'fah_oauth', '', { maxAge: 0 });
    redirect(res, '/');
  } catch {
    redirect(res, '/?login=failed');
  }
}
