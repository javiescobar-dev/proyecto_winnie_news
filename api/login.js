// POST /api/login  { password } → { token }
import { checkPassword, createToken } from '../lib/auth.js';
import { onlyPost, readJson, sendJson, sendError } from '../lib/http.js';

export default async function handler(req, res) {
  if (!onlyPost(req, res)) return;
  try {
    const body = await readJson(req);
    const ok = await checkPassword(body?.password);
    if (!ok) return sendJson(res, 401, { error: 'Contraseña incorrecta' });
    sendJson(res, 200, { token: createToken() });
  } catch (err) {
    sendError(res, err);
  }
}
