// Who is logged in, and are they on the crew list?
import { crewIds, getSession, json } from './_lib/http.js';

export default function handler(req, res) {
  const s = getSession(req);
  if (!s) return json(res, 200, { user: null, crew: false });
  json(res, 200, { user: { id: s.uid, name: s.name, avatar: s.avatar }, crew: crewIds().includes(s.uid) });
}
