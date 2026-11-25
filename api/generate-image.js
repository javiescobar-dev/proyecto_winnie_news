// POST /api/generate-image  { prompt } → { imageBase64, mime }
import { requireAuth } from '../lib/auth.js';
import { getConfig } from '../lib/config.js';
import { onlyPost, readJson, sendJson, sendError } from '../lib/http.js';
import { IMAGE_STYLE } from '../lib/prompts.js';
import { getImageProvider } from '../lib/providers/index.js';

export default async function handler(req, res) {
  if (!onlyPost(req, res)) return;
  if (!requireAuth(req, res)) return;

  try {
    const body = await readJson(req);
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const { limits, image } = getConfig();
    if (!prompt) return sendJson(res, 400, { error: 'El prompt de la imagen está vacío' });
    if (prompt.length > limits.maxImagePromptChars) {
      return sendJson(res, 413, { error: `El prompt es demasiado largo (máximo ${limits.maxImagePromptChars} caracteres)` });
    }

    const result = await getImageProvider().generateImage({
      prompt: `${IMAGE_STYLE} ${prompt}`,
      width: image.width,
      height: image.height,
    });
    sendJson(res, 200, { imageBase64: result.base64, mime: result.mime });
  } catch (err) {
    sendError(res, err);
  }
}
