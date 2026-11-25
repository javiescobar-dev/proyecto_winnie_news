// Proveedor de texto: Groq (API compatible con OpenAI).
// Interfaz común de los proveedores de texto: generateJSON({ system, user }) → objeto.
import { getConfig } from '../../config.js';
import { ProviderError } from '../../http.js';

const URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function generateJSON({ system, user, temperature = 0.5 }) {
  const { apiKey, model } = getConfig().groq;
  if (!apiKey) throw new ProviderError('Falta GROQ_API_KEY en las variables de entorno', 500);

  let response;
  try {
    response = await fetch(URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: 6000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
  } catch (err) {
    throw new ProviderError(`No se pudo conectar con Groq: ${err.message}`);
  }

  if (response.status === 429) {
    throw new ProviderError('Groq ha alcanzado su límite de uso gratuito. Espera un minuto y vuelve a intentarlo.', 429);
  }
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new ProviderError(`Groq respondió ${response.status}: ${detail}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  try {
    return JSON.parse(content);
  } catch {
    throw new ProviderError('Groq devolvió una respuesta que no es JSON válido');
  }
}
