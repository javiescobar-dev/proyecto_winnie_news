// Diccionario inglés→español de nombres propios (data/dictionary.json).
// Fallback seguro: si el archivo no existe o está mal formado, se usa un diccionario
// vacío y el texto se deja tal cual. Los términos que no estén en el diccionario
// tampoco se tocan. Nunca lanza errores.
import fs from 'node:fs';
import path from 'node:path';

const DICTIONARY_PATH = path.join(process.cwd(), 'data', 'dictionary.json');
const URL_RE = /(https?:\/\/\S+)/g;

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function loadDictionary(file = DICTIONARY_PATH) {
  try {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    const terms = Array.isArray(json?.terminos) ? json.terminos : [];
    return terms.filter((t) => typeof t?.en === 'string' && t.en.trim() && typeof t?.es === 'string' && t.es.trim());
  } catch (err) {
    console.warn(`[winnie-news] Diccionario no disponible (${err.message}). Se continúa sin traducciones.`);
    return [];
  }
}

// Crea una función que sustituye los términos del diccionario en un texto.
// Se hace en una sola pasada (del término más largo al más corto) para no
// traducir dos veces lo ya traducido, y nunca se tocan las URL.
export function createTranslator(terms) {
  const map = new Map();
  for (const term of terms) {
    const replacement = term.mostrarOriginal === false ? term.es.trim() : `${term.es.trim()} (${term.en.trim()})`;
    const variants = [term.en, ...(Array.isArray(term.alias) ? term.alias : [])];
    for (const variant of variants) {
      if (typeof variant === 'string' && variant.trim()) map.set(variant.trim().toLowerCase(), replacement);
    }
  }
  if (map.size === 0) return { translate: (text) => text, used: () => [] };

  const alternatives = [...map.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp);
  const termRe = new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  const usedTerms = new Set();

  const translatePart = (part) =>
    part
      .replace(termRe, (found) => {
        usedTerms.add(found.toLowerCase());
        return map.get(found.toLowerCase()) ?? found;
      })
      // El original ya traía las dos versiones: "El Invernáculo (La Botánica)" → "El Invernáculo (El Invernáculo)" → "El Invernáculo"
      .replace(/([\p{L}\p{N}'’ -]{3,80}) \(\1\)/gu, '$1');

  const translate = (text) =>
    text
      .split(URL_RE)
      .map((part) => (/^https?:\/\//.test(part) ? part : translatePart(part)))
      .join('');

  return { translate, used: () => [...usedTerms] };
}
