// Proveedor de imagen: Cloudflare Workers AI (por defecto Flux-1-schnell, con cuota diaria gratuita).
// Interfaz común de los proveedores de imagen: generateImage({ prompt, width, height }) → { base64, mime }.
import { getConfig } from '../../config.js';
import { ProviderError } from '../../http.js';

export async function generateImage({ prompt, width, height }) {
  const { accountId, apiToken, model } = getConfig().cloudflare;
  if (!accountId || !apiToken) {
    throw new ProviderError('Faltan CF_ACCOUNT_ID o CF_API_TOKEN en las variables de entorno', 500);
  }

  const body = { prompt };
  if (model.includes('flux-1-schnell')) {
    body.steps = 8; // máximo permitido por el modelo: mejor calidad, sigue siendo rápido
    // Flux-1-schnell en Workers AI no acepta tamaño: siempre devuelve 1024×1024.
  } else {
    body.width = width;
    body.height = height;
  }

  let response;
  try {
    response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new ProviderError(`No se pudo conectar con Cloudflare: ${err.message}`);
  }

  if (response.status === 429) {
    throw new ProviderError('Se ha agotado la cuota gratuita diaria de imágenes de Cloudflare. Prueba mañana.', 429);
  }
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new ProviderError(`Cloudflare respondió ${response.status}: ${detail}`);
  }

  const type = response.headers.get('content-type') || '';
  // Algunos modelos (Flux) responden JSON con la imagen en base64; otros (SDXL) la imagen en binario.
  if (type.includes('application/json')) {
    const json = await response.json();
    const image = json.result?.image;
    if (!image) throw new ProviderError('Cloudflare no devolvió ninguna imagen');
    return { base64: image, mime: 'image/jpeg' };
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return { base64: buffer.toString('base64'), mime: type.split(';')[0] || 'image/png' };
}
