// Limpieza determinista del texto copiado del foro, antes de enviarlo a la IA:
//  1. Quita el ruido del foro (firma del usuario, "Compartir", "Top", "APLICADO EN ...").
//  2. Detecta el nº de compilación.
//  3. Separa las entradas por su categoría entre corchetes ([Varios], [Mazmorras]...).
//  4. Excluye las entradas que no estén marcadas como "Funciona correctamente".
// Así la exclusión no depende de que la IA lo haga bien.

const NOISE_PATTERNS = [
  // "Compartir:   Thalassa   Top" (va antes que la firma, que puede empezar por "TopWinniie")
  /Compartir:[^\n]*?\bTop(?=[A-ZÁÉÍÓÚÑ]|\s|$)/g,
  /Compartir:/g,
  // Bloque de firma: "TopWinniie Winniie Jugador desconectado.Staff NaerZone ... Publicado hace X (CET) - Editado por Y hace Z (CET)"
  /\S+\s+\S+\s+Jugador\s+(?:des)?conectado\.[\s\S]*?Publicado\s[^()]*\(CET\)(?:\s*-\s*Editado\s[^()]*\(CET\))?/gi,
  // "APLICADO EN THALASSA" (a veces pegado a la palabra siguiente: "THALASSACompartir")
  /APLICADO\s+EN\s+[A-ZÁÉÍÓÚÑ ]+?(?=[A-ZÁÉÍÓÚÑ][a-záéíóúñ]|\s*\n|\s*$)/g,
];

const CATEGORY_RE = /\[([A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{2,30})\]/g;
const COMPILATION_RE = /COMPILACI[OÓ]N\s*(?:N[ºo°]\.?\s*)?(\d+)/i;
// "1.1.149 - 10/10/2026:" o "7.1.13 -" al principio de una entrada
const VERSION_RE = /^\s*\d+(?:\.\d+)+\s*(?:-\s*(?:\d{1,2}\/\d{1,2}\/\d{2,4})?\s*:?)?\s*/;

export function removeNoise(text) {
  let clean = text.replace(/\r\n?/g, '\n');
  for (const pattern of NOISE_PATTERNS) clean = clean.replace(pattern, ' ');
  return clean.replace(/[ \t]{2,}/g, ' ').trim();
}

function statusOf(text) {
  if (/funciona\s+incorrectamente/i.test(text)) return 'incorrecto';
  if (/funciona\s+correctamente/i.test(text)) return 'correcto';
  return 'sin estado';
}

function summarize(text, max = 140) {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export function preprocess(raw) {
  const clean = removeNoise(raw);
  const number = clean.match(COMPILATION_RE)?.[1] ?? null;

  const matches = [...clean.matchAll(CATEGORY_RE)];
  const header = (matches.length ? clean.slice(0, matches[0].index) : clean).trim();

  const entries = [];
  const excluded = [];
  matches.forEach((match, i) => {
    const end = i + 1 < matches.length ? matches[i + 1].index : clean.length;
    const category = match[1].trim();
    const body = clean.slice(match.index + match[0].length, end).replace(VERSION_RE, '').trim();
    if (!body) return;
    const status = statusOf(body);
    if (status === 'correcto') entries.push({ category, text: body });
    else excluded.push({ category, status, summary: summarize(body) });
  });

  return { number, header, entries, excluded };
}
