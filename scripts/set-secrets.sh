#!/usr/bin/env bash
# Puts your Discord secrets into bot/.env and web/.env.local without them
# ever being shown on screen or pasted anywhere else.
#   bash scripts/set-secrets.sh
# Both files are git-ignored. Run it again any time to change a value
# (press Enter to keep what's already there).
set -euo pipefail
cd "$(dirname "$0")/.."

BOT=bot/.env
WEB=web/.env.local
[ -f "$BOT" ] || cp bot/.env.example "$BOT"
[ -f "$WEB" ] || cp web/.env.example "$WEB"

# setval FILE KEY VALUE  -> replaces (or adds) KEY=VALUE in FILE
setval() {
  python3 - "$1" "$2" "$3" <<'PY'
import sys, re
path, key, val = sys.argv[1:]
lines = open(path).read().splitlines()
for i, line in enumerate(lines):
    if re.match(rf'^\s*{re.escape(key)}=', line):
        lines[i] = f'{key}={val}'
        break
else:
    lines.append(f'{key}={val}')
open(path, 'w').write('\n'.join(lines) + '\n')
PY
}

# getval FILE KEY -> current value (empty if unset)
getval() { grep -E "^$2=" "$1" 2>/dev/null | head -1 | cut -d= -f2- || true; }

status() { [ -n "$(getval "$1" "$2")" ] && echo "set" || echo "empty"; }

echo "FAH Office secrets setup. Typing is hidden for secrets. Press Enter to skip/keep."
echo

read -r -p "Discord Client ID (OAuth2 page, not secret) [$(status "$WEB" DISCORD_CLIENT_ID)]: " CID
[ -n "$CID" ] && setval "$WEB" DISCORD_CLIENT_ID "$CID"

read -r -s -p "Bot token (Bot page > Reset Token) [$(status "$BOT" DISCORD_TOKEN)]: " TOKEN; echo
[ -n "$TOKEN" ] && setval "$BOT" DISCORD_TOKEN "$TOKEN"

read -r -s -p "Client secret (OAuth2 page > Reset Secret) [$(status "$WEB" DISCORD_CLIENT_SECRET)]: " CSECRET; echo
[ -n "$CSECRET" ] && setval "$WEB" DISCORD_CLIENT_SECRET "$CSECRET"

# The two app passwords are made for you (only if not set yet).
LIVE=$(getval "$BOT" LIVE_SECRET)
[ -z "$LIVE" ] && LIVE=$(getval "$WEB" LIVE_SECRET)
[ -z "$LIVE" ] && LIVE=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
setval "$BOT" LIVE_SECRET "$LIVE"
setval "$WEB" LIVE_SECRET "$LIVE"

if [ -z "$(getval "$WEB" SESSION_SECRET)" ]; then
  setval "$WEB" SESSION_SECRET "$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
fi

unset TOKEN CSECRET LIVE
echo
echo "Done. What's filled in now (values not shown):"
for k in DISCORD_TOKEN GUILD_ID VOICE_CHANNEL_ID CREW_USER_IDS MUSIC_BOT_IDS LIVE_SECRET; do
  printf '  bot/.env        %-22s %s\n' "$k" "$(status "$BOT" "$k")"
done
for k in DISCORD_CLIENT_ID DISCORD_CLIENT_SECRET CREW_USER_IDS LIVE_SECRET SESSION_SECRET; do
  printf '  web/.env.local  %-22s %s\n' "$k" "$(status "$WEB" "$k")"
done
