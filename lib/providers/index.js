// Registro de proveedores. Para añadir uno nuevo: crea el archivo con la misma
// interfaz (generateJSON o generateImage), impórtalo aquí y selecciónalo con
// TEXT_PROVIDER / IMAGE_PROVIDER en las variables de entorno.
import { getConfig } from '../config.js';
import * as groq from './text/groq.js';
import * as cloudflare from './image/cloudflare.js';
import * as huggingface from './image/huggingface.js';

const textProviders = { groq };
const imageProviders = { cloudflare, huggingface };

export function getTextProvider() {
  const name = getConfig().textProvider;
  const provider = textProviders[name];
  if (!provider) throw new Error(`Proveedor de texto desconocido: "${name}"`);
  return provider;
}

export function getImageProvider() {
  const name = getConfig().imageProvider;
  const provider = imageProviders[name];
  if (!provider) throw new Error(`Proveedor de imagen desconocido: "${name}"`);
  return provider;
}
