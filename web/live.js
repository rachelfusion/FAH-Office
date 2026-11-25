// Connects the office to real Discord data.
//   1. Ask our Vercel API who is logged in.
//   2. If you're on the crew list, get a short-lived pass and open a WebSocket to the bot.
//   3. Every update from the bot moves the characters.
// Without the API (e.g. opening index.html straight from disk), the page stays in demo mode.
(async function () {
  const O = window.Office;
  if (!O) return;

  const api = async (path, opts = {}) => {
    const r = await fetch(path, { credentials: 'same-origin', ...opts });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
    return body;
  };

  let cfg;
  try { cfg = await api('/api/config'); }
  catch { return O.setMode('demo', { reason: 'no-api' }); }

  let me = { user: null, crew: false };
  try { me = await api('/api/me'); } catch { /* treat as signed out */ }
  if (!me.user) return O.setMode('demo', { reason: cfg.login ? 'signed-out' : 'no-api' });
  if (!me.crew) return O.setMode('demo', { reason: 'not-crew', user: me.user });
  if (!cfg.liveUrl) return O.setMode('demo', { reason: 'no-bot', user: me.user });

  let looks = {};
  if (cfg.looks) {
    try { looks = (await api('/api/looks')).looks || {}; } catch (e) { console.warn('Could not load saved looks:', e.message); }
  }

  O.onSaveLook = cfg.looks
    ? async (look) => {
        await api('/api/looks', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(look) });
        looks[me.user.id] = look;
      }
    : async () => { throw new Error('saving looks is not set up yet (add Upstash Redis in Vercel)'); };

  let wentLive = false;
  let retry = 1000;
  let sock = null;
  const send = (msg) => {
    if (!sock || sock.readyState !== WebSocket.OPEN) return false;
    sock.send(JSON.stringify(msg));
    return true;
  };
  O.onPickActivity = (activity) => send({ type: 'activity', activity });
  O.onSetPrefs = (prefs) => send({ type: 'prefs', ...prefs });

  async function connect() {
    let token;
    try { ({ token } = await api('/api/live-token')); }
    catch (e) { console.warn('No live pass:', e.message); return later(); }

    const ws = new WebSocket(`${cfg.liveUrl}/live?token=${encodeURIComponent(token)}`);
    sock = ws;
    ws.onopen = () => { retry = 1000; };
    ws.onmessage = (ev) => {
      let snap;
      try { snap = JSON.parse(ev.data); } catch { return; }
      if (snap.type !== 'state') return;
      if (!wentLive) { wentLive = true; O.setMode('live', { user: me.user }); }
      O.setLiveStatus('live');
      O.applyLive(snap, { looks, meId: me.user.id });
    };
    ws.onclose = () => { if (wentLive) O.setLiveStatus('reconnecting'); later(); };
  }

  function later() {
    setTimeout(connect, retry);
    retry = Math.min(retry * 2, 30_000);
  }

  O.setMode('demo', { reason: 'connecting', user: me.user });
  connect();
})();
