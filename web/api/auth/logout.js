import { redirect, setCookie } from '../_lib/http.js';

export default function handler(req, res) {
  setCookie(res, 'fah_session', '', { maxAge: 0 });
  redirect(res, '/');
}
