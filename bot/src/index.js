// office-bot: sits in your Discord server, watches one voice channel, and
// streams "who's where" to the office page over a WebSocket.
//
// It needs to stay running all the time (Discord only reports voice changes
// over a connection the bot keeps open), so host it on Railway, Fly.io, Render
// or any small always-on machine. Not on Vercel.
import http from 'node:http';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { WebSocketServer } from 'ws';
import { ACTIVITIES, botState, resolveActivity, voiceFacts } from './state.js';
import { verify } from './token.js';

const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);
const cfg = {
  token: process.env.DISCORD_TOKEN,
  guildId: process.env.GUILD_ID,
  channelId: process.env.VOICE_CHANNEL_ID,
  crew: list(process.env.CREW_USER_IDS),
  musicBots: list(process.env.MUSIC_BOT_IDS),
  secret: process.env.LIVE_SECRET,
  port: Number(process.env.PORT) || 8080,
  origins: list(process.env.ALLOWED_ORIGINS),
};

const missing = { token: 'DISCORD_TOKEN', guildId: 'GUILD_ID', channelId: 'VOICE_CHANNEL_ID', secret: 'LIVE_SECRET' };
const notSet = Object.entries(missing).filter(([k]) => !cfg[k]).map(([, name]) => name);
if (notSet.length) {
  console.error(`Missing settings: ${notSet.join(', ')}. Copy bot/.env.example to bot/.env and fill it in.`);
  process.exit(1);
}
if (!cfg.crew.length) console.warn('CREW_USER_IDS is empty, so nobody will get a bunk. Add your Discord user IDs.');

/* ---------------- Discord side ---------------- */
// Only non-privileged intents: no extra toggles needed in the Developer Portal.
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
let snapshot = { type: 'state', channel: null, crew: [], bots: [], updatedAt: 0 };

// What each person picked in the app. Kept in memory: a bot restart resets
// everyone to 'working' with the deafen shortcut on.
const prefs = new Map();
function prefFor(id) {
  if (!prefs.has(id)) prefs.set(id, { pick: null, deafenMeeting: true, override: false, lastDeaf: null });
  return prefs.get(id);
}

async function memberInfo(guild, id) {
  const m = guild.members.cache.get(id) ?? (await guild.members.fetch(id).catch(() => null));
  return {
    id,
    name: m?.displayName ?? 'Unknown',
    avatar: m ? m.displayAvatarURL({ size: 64, extension: 'png' }) : null,
  };
}

async function rebuild(reason) {
  const guild = await client.guilds.fetch(cfg.guildId);
  const channel = guild.channels.cache.get(cfg.channelId) ?? (await guild.channels.fetch(cfg.channelId).catch(() => null));
  const voice = (id) => guild.voiceStates.cache.get(id);
  const crew = await Promise.all(cfg.crew.map(async (id) => {
    const facts = voiceFacts(voice(id), cfg.channelId);
    const p = prefFor(id);
    if (!facts.inChannel) { p.pick = null; p.override = false; }           // leaving the call resets your pick
    if (p.lastDeaf !== facts.deafened) { p.override = false; p.lastDeaf = facts.deafened; } // (un)deafening re-enables the shortcut
    return {
      ...(await memberInfo(guild, id)),
      state: resolveActivity({ ...facts, ...p }),
      deafened: facts.deafened,
      pick: p.pick,
      deafenMeeting: p.deafenMeeting,
    };
  }));
  const bots = await Promise.all(cfg.musicBots.map(async (id) => ({ ...(await memberInfo(guild, id)), state: botState(voice(id), cfg.channelId) })));
  snapshot = { type: 'state', channel: channel?.name ?? null, crew, bots, updatedAt: Date.now() };
  broadcast();
  console.log(`[state] ${reason}: ${crew.map((c) => `${c.name}=${c.state}`).join(', ') || 'no crew'}`);
}

let pending = null;
function schedule(reason) {
  clearTimeout(pending);
  pending = setTimeout(() => rebuild(reason).catch((e) => console.error('[state] could not rebuild:', e.message)), 150);
}

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}, watching channel ${cfg.channelId}`);
  schedule('startup');
});
client.on(Events.VoiceStateUpdate, (before, after) => {
  const id = after.id;
  const watched = cfg.crew.includes(id) || cfg.musicBots.includes(id);
  const touchesChannel = before.channelId === cfg.channelId || after.channelId === cfg.channelId;
  if (watched && touchesChannel) schedule('voice');
});
client.on(Events.Error, (e) => console.error('[discord]', e.message));

/* ---------------- Browser side ---------------- */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end(client.isReady() ? 'ok' : 'starting');
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('Not found. The office page connects to /live.');
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });

// Messages from a logged-in crew member's page.
function onClientMessage(ws, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }
  if (!cfg.crew.includes(ws.uid)) return;
  const p = prefFor(ws.uid);
  if (msg.type === 'activity' && ACTIVITIES.includes(msg.activity)) {
    const guild = client.guilds.cache.get(cfg.guildId);
    p.pick = msg.activity;
    p.override = voiceFacts(guild?.voiceStates.cache.get(ws.uid), cfg.channelId).deafened; // picking while deafened wins
    schedule(`pick ${msg.activity}`);
  } else if (msg.type === 'prefs' && typeof msg.deafenMeeting === 'boolean') {
    p.deafenMeeting = msg.deafenMeeting;
    schedule('prefs');
  }
}

function reject(socket, code, text) {
  socket.write(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== '/live') return reject(socket, 404, 'Not Found');
  if (cfg.origins.length && !cfg.origins.includes(req.headers.origin)) return reject(socket, 403, 'Forbidden');
  const pass = verify(url.searchParams.get('token'), cfg.secret);
  if (!pass) return reject(socket, 401, 'Unauthorized');
  wss.handleUpgrade(req, socket, head, (ws) => {
    ws.uid = String(pass.uid);
    ws.isAlive = true;
    ws.on('message', (raw) => onClientMessage(ws, raw));
    ws.on('pong', () => { ws.isAlive = true; });
    ws.send(JSON.stringify(snapshot));
  });
});

function broadcast() {
  const data = JSON.stringify(snapshot);
  for (const ws of wss.clients) if (ws.readyState === 1) ws.send(data);
}

// Drop browsers that went away without saying goodbye.
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30_000);

server.listen(cfg.port, () => console.log(`Live server listening on :${cfg.port} (WebSocket path /live)`));
client.login(cfg.token).catch((e) => {
  console.error('Could not log in to Discord. Check DISCORD_TOKEN.', e.message);
  process.exit(1);
});
