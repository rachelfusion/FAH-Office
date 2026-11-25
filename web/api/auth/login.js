// Sends you to Discord to log in. Only asks for "identify" (your name and avatar).
import crypto from 'node:crypto';
import { json, publicUrl, redirect, setCookie } from '../_lib/http.js';

export default function handler(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return json(res, 500, { error: 'DISCORD_CLIENT_ID is not set in Vercel.' });
  const state = crypto.randomBytes(16).toString('hex');
  setCookie(res, 'fah_oauth', state, { maxAge: 600 });
  const q = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: 'identify',
    redirect_uri: `${publicUrl(req)}/api/auth/callback`,
    state,
    prompt: 'none',
  });
  redirect(res, `https://discord.com/oauth2/authorize?${q}`);
}
