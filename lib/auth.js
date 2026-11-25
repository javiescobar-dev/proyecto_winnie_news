// Contraseña (hash bcrypt en APP_PASSWORD_HASH) y token de sesión firmado con HMAC.
// El token tiene la forma "<caducidad en ms>.<firma>" y no guarda nada más.
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { sendJson } from './http.js';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('Falta SESSION_SECRET en las variables de entorno (mínimo 16 caracteres)');
  }
  return secret;
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url');
}

export async function checkPassword(password) {
  const hash = process.env.APP_PASSWORD_HASH;
  if (!hash) throw new Error('Falta APP_PASSWORD_HASH en las variables de entorno');
  if (typeof password !== 'string' || password.length === 0 || password.length > 200) return false;
  return bcrypt.compare(password, hash);
}

export function createToken() {
  const expires = String(Date.now() + TOKEN_TTL_MS);
  return `${expires}.${sign(expires)}`;
}

export function verifyToken(token) {
  if (typeof token !== 'string') return false;
  const [expires, signature] = token.split('.');
  if (!expires || !signature) return false;
  const expected = Buffer.from(sign(expires));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return false;
  return Number(expires) > Date.now();
}

// Corta la petición con 401 si no trae un token válido. Devuelve true si puede seguir.
export function requireAuth(req, res) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (verifyToken(token)) return true;
  sendJson(res, 401, { error: 'Sesión no válida o caducada. Vuelve a entrar.' });
  return false;
}
