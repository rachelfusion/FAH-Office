# FAH Office

A late-night 3D hangout office for your Discord voice call. Everyone on the crew has a chibi character:

| In Discord | In the office |
|---|---|
| Not in the voice channel | 💤 Asleep in their bunk |
| In the voice channel | 💻 Locked in at the big shared table |
| In the channel | You pick: 💻 working (big table) · ☕ café (Moon Café across the street) · 🎮 gaming (couch + TV) · 🤝 meeting (glass room with Simon, an NPC) · 🍜 eating (ramen bar) · 📱 phone (beanbags) · 🛍️ out (strolling the shops, benches) |
| Deafened | Shortcut to 🤝 meeting (each person can switch this off); undeafen to go back |
| Music bot in the channel | 🎛️ At the DJ decks, speakers thumping |
| Music bot not in the channel | 🔌 Charging on its dock |

Each person can restyle their own character (hair, fit, hats, glasses), and it's saved to their Discord account.

## How it fits together

```
Discord ──(voice updates)──►  bot/   always-on Node app (Railway / Fly.io / Render)
                                │  WebSocket: "who's where"
                                ▼
you & friends ──► web/  on Vercel: the 3D page + small API
                          • Log in with Discord
                          • saved looks (Upstash Redis)
                          • 5-minute passes so only the crew can connect to the bot
```

Vercel can't run the bot: Discord only reports voice changes over a connection that stays open, and Vercel functions shut down after each request. So the bot lives on a host that keeps it running.

```
bot/
  src/index.js     watches the voice channel, serves the WebSocket at /live
  src/state.js     voice state + your pick → asleep / working / gaming / meeting / eating / phone
  src/token.js     checks the pass from the website
  src/board.js     text for the live board and /office
  test/            node --test
web/
  index.html, styles.css, office.js   the 3D office (works on its own as a demo)
  live.js          logs in and connects to the bot
  api/             Vercel functions: auth/login, auth/callback, auth/logout, me, config, live-token, looks
```

## Setup

### 1. Discord application

1. Go to <https://discord.com/developers/applications> → **New Application** (e.g. "FAH Office").
2. **Bot** tab → **Reset Token** → copy it (this is `DISCORD_TOKEN`). No privileged intents are needed.
3. **OAuth2** tab → copy the **Client ID** and **Client Secret**. Under **Redirects**, add
   `https://YOUR-SITE.vercel.app/api/auth/callback` (fill in once you know your Vercel address).
4. Invite the bot: **OAuth2 → URL Generator** → scopes `bot`, permissions **View Channels** → open the link and pick your server.
5. In Discord, turn on **Settings → Advanced → Developer Mode**, then right-click to copy:
   your server ID, the voice channel ID, each crew member's user ID (up to 4), and each music bot's user ID (up to 2).

Make two random secrets (run this twice):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

One is `LIVE_SECRET` (same value on the bot and Vercel), the other is `SESSION_SECRET` (Vercel only).

### 2. Deploy the bot (Railway example)

1. Railway → **New Project → Deploy from GitHub repo** → pick this repo.
2. Service **Settings → Root Directory**: `bot`. Start command: `npm start`.
3. **Variables**: everything in [`bot/.env.example`](bot/.env.example).
4. **Settings → Networking → Generate Domain**. Your live address is `wss://<that-domain>` — that's `BOT_LIVE_URL` for Vercel.
5. Check `https://<that-domain>/health` says `ok`.

Fly.io and Render work too; there's a `Dockerfile` in `bot/`.

### 3. Deploy the site on Vercel

1. Vercel → **Add New → Project** → import this repo.
2. **Root Directory**: `web`. Framework preset: **Other**. No build command.
3. **Environment Variables**: everything in [`web/.env.example`](web/.env.example).
4. **Storage / Marketplace → Upstash for Redis** → connect it to the project (this is where looks are saved).
5. Deploy, then put the final address into Discord's OAuth2 redirect (step 1.3), `PUBLIC_URL` on Vercel, and optionally `ALLOWED_ORIGINS` on the bot.

Open the site → **Log in with Discord** → the chip in the top right turns **● live**.

## Opening it from Discord

- **`/office`**: type it in any channel. The bot replies (only you see it) with who's doing what and an **Open the office** button.
- **Live office board**: set `BOARD_CHANNEL_ID` on the bot to a text channel. The bot posts one message there and keeps editing it as people move around. Pin it.

Both need the bot invited with slash commands and message permissions. If the bot was invited before these existed, re-invite it (it keeps its place, it just gets the new permissions):
`https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot%20applications.commands&permissions=84992`
(View Channels, Send Messages, Embed Links, Read Message History.)

## Running locally

Demo mode only (no Discord):

```bash
cd web && python3 -m http.server 5173
```

Bot:

```bash
cd bot && cp .env.example .env   # fill it in
npm install && npm run dev
```

Site with the API:

```bash
cd web && npx vercel dev
```

Tests:

```bash
cd bot && npm test
```

## Notes and limits

- 4 bunks and 6 seats, so up to 4 crew and 2 music bots.
- Music bots count as "playing" whenever they're in the call. Discord doesn't tell other bots whether music is actually playing.
- The green "talking" ring is simulated in demo mode only. Real talking detection would need the bot to join the call and listen for speaking events; that's a possible next step.
