// Proveedor de imagen alternativo: Hugging Face Inference Providers.
// Ojo: el plan gratuito solo incluye unos céntimos de crédito al mes.
import { getConfig } from '../../config.js';
import { ProviderError } from '../../http.js';

export async function generateImage({ prompt, width, height }) {
  const { token, model, endpoint } = getConfig().huggingface;
  if (!token) throw new ProviderError('Falta HF_API_TOKEN en las variables de entorno', 500);

  let response;
  try {
    response = await fetch(endpoint.replace('{model}', model), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'image/*' },
      body: JSON.stringify({ inputs: prompt, parameters: { width, height } }),
    });
  } catch (err) {
    throw new ProviderError(`No se pudo conectar con Hugging Face: ${err.message}`);
  }

  if (response.status === 402 || response.status === 429) {
    throw new ProviderError('Se han agotado los créditos o el límite de Hugging Face.', 429);
  }
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new ProviderError(`Hugging Face respondió ${response.status}: ${detail}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const mime = (response.headers.get('content-type') || 'image/jpeg').split(';')[0];
  return { base64: buffer.toString('base64'), mime };
}
