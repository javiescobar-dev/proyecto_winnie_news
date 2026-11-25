// Utilidades HTTP compartidas por las funciones de /api.
// Usan solo la API estándar de Node (res.statusCode, res.end), así funcionan
// igual en Vercel y en el servidor local de scripts/dev-server.js.

export function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export function onlyPost(req, res) {
  if (req.method === 'POST') return true;
  res.setHeader('Allow', 'POST');
  sendJson(res, 405, { error: 'Método no permitido' });
  return false;
}

// Devuelve el cuerpo JSON de la petición, o null si no es JSON válido.
export async function readJson(req) {
  try {
    // Vercel ya parsea el cuerpo y lo deja en req.body (acceder puede lanzar si es inválido).
    const body = req.body;
    if (body !== undefined) {
      if (typeof body === 'string') return JSON.parse(body);
      if (Buffer.isBuffer(body)) return JSON.parse(body.toString('utf8'));
      return body;
    }
  } catch {
    return null;
  }
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString('utf8');
    return text ? JSON.parse(text) : {};
  } catch {
    return null;
  }
}

// Error de un proveedor de IA, con el código HTTP que conviene devolver al navegador.
export class ProviderError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

// Convierte cualquier error en una respuesta JSON legible para la interfaz.
export function sendError(res, err) {
  const status = err instanceof ProviderError ? err.status : 500;
  console.error('[winnie-news]', err);
  sendJson(res, status, { error: err.message || 'Error inesperado' });
}
