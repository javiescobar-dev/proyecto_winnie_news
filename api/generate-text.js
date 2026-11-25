// POST /api/generate-text  { raw } → { data, imagePrompt, excluded, number, usedTerms }
// Limpieza y filtrado en código → diccionario → IA (JSON) → validación.
import { requireAuth } from '../lib/auth.js';
import { getConfig } from '../lib/config.js';
import { createTranslator, loadDictionary } from '../lib/dictionary.js';
import { onlyPost, readJson, sendJson, sendError, ProviderError } from '../lib/http.js';
import { preprocess } from '../lib/preprocess.js';
import { NEWS_SYSTEM_PROMPT, buildNewsUserPrompt } from '../lib/prompts.js';
import { getTextProvider } from '../lib/providers/index.js';

const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

// Comprueba la forma de la respuesta de la IA y la deja limpia. Devuelve null si no sirve.
function normalize(out) {
  if (!out || !Array.isArray(out.entradas)) return null;
  const entradas = out.entradas
    .map((e) => ({
      categoria: text(e?.categoria) ?? 'Varios',
      ruta: text(e?.ruta),
      descripcion: text(e?.descripcion),
      dev: text(e?.dev),
      testers: text(e?.testers),
      nota: text(e?.nota),
      soluciona: /^https?:\/\/\S+$/.test(text(e?.soluciona) ?? '') ? text(e.soluciona) : null,
    }))
    .filter((e) => e.descripcion);
  if (entradas.length === 0) return null;
  return {
    titular: text(out.titular) ?? '⚙️ ¡Nuevos arreglos en NaerZone!',
    intro: (Array.isArray(out.intro) ? out.intro : [out.intro]).map(text).filter(Boolean),
    cierre: text(out.cierre) ?? '🔥 ¡Descubrid a continuación todos los arreglos implementados!',
    entradas,
    imagePrompt: text(out.imagePrompt) ?? 'An epic fantasy landscape with a mighty fortress at dawn',
  };
}

export default async function handler(req, res) {
  if (!onlyPost(req, res)) return;
  if (!requireAuth(req, res)) return;

  try {
    const body = await readJson(req);
    const raw = body?.raw;
    const { maxInputChars } = getConfig().limits;
    if (typeof raw !== 'string' || !raw.trim()) return sendJson(res, 400, { error: 'Pega primero el texto de la compilación' });
    if (raw.length > maxInputChars) {
      return sendJson(res, 413, { error: `El texto es demasiado largo (máximo ${maxInputChars} caracteres)` });
    }

    const pre = preprocess(raw);
    if (pre.entries.length === 0) {
      return sendJson(res, 422, {
        error: 'No hay ninguna entrada marcada como "Funciona correctamente" (o no se reconoce el formato [Categoría]).',
        excluded: pre.excluded,
      });
    }

    const { translate, used } = createTranslator(loadDictionary());
    const entries = pre.entries.map((e) => ({ ...e, text: translate(e.text) }));
    const user = buildNewsUserPrompt({ number: pre.number, header: translate(pre.header), entries });

    const provider = getTextProvider();
    let data = null;
    for (let attempt = 0; attempt < 2 && !data; attempt++) {
      try {
        data = normalize(await provider.generateJSON({ system: NEWS_SYSTEM_PROMPT, user }));
      } catch (err) {
        if (attempt === 1 || (err instanceof ProviderError && err.status !== 502)) throw err;
      }
    }
    if (!data) throw new ProviderError('La IA no devolvió una noticia válida. Vuelve a intentarlo.');

    const { imagePrompt, ...news } = data;
    sendJson(res, 200, {
      data: { ...news, paquete: pre.number },
      imagePrompt,
      excluded: pre.excluded,
      expectedEntries: entries.length,
      usedTerms: used(),
    });
  } catch (err) {
    sendError(res, err);
  }
}
