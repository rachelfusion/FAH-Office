// office-bot: sits in your Discord server, watches one voice channel, and
// streams "who's where" to the office page over a WebSocket.
//
// It needs to stay running all the time (Discord only reports voice changes
// over a connection the bot keeps open), so host it on Railway, Fly.io, Render
// or any small always-on machine. Not on Vercel.
import http from 'node:http';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { WebSocketServer } from 'ws';
import { ACTIVITIES, OFFLINE_OK, botState, resolveActivity, voiceFacts } from './state.js';
import { verify } from './token.js';
import { BOARD_FOOTER, boardLines } from './board.js';

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
  officeUrl: process.env.OFFICE_URL || 'https://fah-office.vercel.app',
  boardChannelId: (process.env.BOARD_CHANNEL_ID || '').trim(),
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
  if (!prefs.has(id)) prefs.set(id, { pick: null, deafenMeeting: true, override: false, lastDeaf: null, lastIn: null });
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
    if (p.lastIn !== null && p.lastIn !== facts.inChannel) { p.pick = null; p.override = false; } // joining or leaving the call starts you fresh
    p.lastIn = facts.inChannel;
    if (!facts.inChannel && !OFFLINE_OK.includes(p.pick)) p.pick = null;
    if (p.lastDeaf !== facts.deafened) { p.override = false; p.lastDeaf = facts.deafened; } // (un)deafening re-enables the shortcut
    return {
      ...(await memberInfo(guild, id)),
      state: resolveActivity({ ...facts, ...p }),
      deafened: facts.deafened,
      inCall: facts.inChannel,
      pick: p.pick,
      deafenMeeting: p.deafenMeeting,
    };
  }));
  const bots = await Promise.all(cfg.musicBots.map(async (id) => ({ ...(await memberInfo(guild, id)), state: botState(voice(id), cfg.channelId) })));
  snapshot = { type: 'state', channel: channel?.name ?? null, crew, bots, updatedAt: Date.now() };
  broadcast();
  scheduleBoard();
  console.log(`[state] ${reason}: ${crew.map((c) => `${c.name}=${c.state}`).join(', ') || 'no crew'}`);
}

let pending = null;
function schedule(reason) {
  clearTimeout(pending);
  pending = setTimeout(() => rebuild(reason).catch((e) => console.error('[state] could not rebuild:', e.message)), 150);
}

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}, watching channel ${cfg.channelId}`);
  schedule('startup');
  await registerCommands(c).catch(() => {});
  if (!cfg.boardChannelId) console.log('[board] BOARD_CHANNEL_ID not set, so no live board. /office still works.');
});

/* ---------------- /office command and the live board ---------------- */
const inviteUrl = (appId) => `https://discord.com/oauth2/authorize?client_id=${appId}&scope=bot%20applications.commands&permissions=84992`;

function officeEmbed() {
  return new EmbedBuilder()
    .setColor(0xff5fa2)
    .setTitle('🏢 FAH Office')
    .setDescription(boardLines(snapshot).join('\n'))
    .setFooter({ text: BOARD_FOOTER })
    .setTimestamp(snapshot.updatedAt || Date.now());
}
function officeButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Open the office').setEmoji('🏢').setURL(cfg.officeUrl),
  );
}

async function registerCommands(c) {
  try {
    const guild = await c.guilds.fetch(cfg.guildId);
    await guild.commands.set([{ name: 'office', description: 'Open the FAH office and see who is doing what' }]);
    console.log('[commands] /office is ready');
  } catch (e) {
    console.error(`[commands] could not add /office (${e.message}). Re-invite the bot with this link: ${inviteUrl(c.user.id)}`);
  }
}

client.on(Events.InteractionCreate, async (i) => {
  if (!i.isChatInputCommand() || i.commandName !== 'office') return;
  await i.reply({ embeds: [officeEmbed()], components: [officeButton()], flags: MessageFlags.Ephemeral })
    .catch((e) => console.error('[office]', e.message));
});

// One message in BOARD_CHANNEL_ID that the bot keeps editing. Updates are
// bundled into one edit every few seconds to stay well under Discord's limits.
let boardMsg = null;
let boardTimer = null;
let lastBoard = '';
function scheduleBoard() {
  if (!cfg.boardChannelId || boardTimer) return;
  boardTimer = setTimeout(async () => {
    boardTimer = null;
    try { await updateBoard(); } catch (e) {
      console.error(`[board] could not update (${e.message}). Check BOARD_CHANNEL_ID, or re-invite the bot: ${inviteUrl(client.user.id)}`);
    }
  }, 4000);
}
async function updateBoard() {
  const text = boardLines(snapshot).join('\n');
  if (boardMsg && text === lastBoard) return;
  const channel = await client.channels.fetch(cfg.boardChannelId);
  if (!channel || !channel.isTextBased()) throw new Error('BOARD_CHANNEL_ID is not a text channel');
  if (!boardMsg) {
    const recent = await channel.messages.fetch({ limit: 50 });
    boardMsg = recent.find((m) => m.author.id === client.user.id && m.embeds[0]?.footer?.text === BOARD_FOOTER) || null;
  }
  const payload = { embeds: [officeEmbed()], components: [officeButton()] };
  if (boardMsg) await boardMsg.edit(payload);
  else { boardMsg = await channel.send(payload); console.log('[board] posted the live board. Pin it in Discord!'); }
  lastBoard = text;
}
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
  if (msg.type === 'activity' && (ACTIVITIES.includes(msg.activity) || msg.activity === 'offline')) {
    const guild = client.guilds.cache.get(cfg.guildId);
    const facts = voiceFacts(guild?.voiceStates.cache.get(ws.uid), cfg.channelId);
    if (!facts.inChannel && msg.activity !== 'offline' && !OFFLINE_OK.includes(msg.activity)) return; // indoor activities need the call
    p.pick = msg.activity === 'offline' ? null : msg.activity;
    p.override = facts.deafened; // picking while deafened wins
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
