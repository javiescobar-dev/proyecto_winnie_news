// Convierte los datos que devuelve la IA en el mensaje de Discord (Markdown).
// Todo el formato visual del anuncio se ajusta aquí, sin tocar el prompt.

export const SETTINGS = {
  mention: '@everyone',
  limit: 4000, // Discord con Nitro (sin Nitro: 2000)
  hideLinkPreviews: true, // <url> evita que Discord genere una tarjeta de vista previa por cada enlace
};

function formatEntry(e) {
  const credits = [e.dev ? `por **${e.dev}**` : null, e.testers ? `*Testeado por ${e.testers}*` : null]
    .filter(Boolean)
    .join(' · ');
  const route = e.ruta ? `${e.ruta}: ` : '';
  const lines = [`**[${e.categoria}]** ${route}${e.descripcion}${credits ? ` ${credits}` : ''}`];
  if (e.nota) lines.push(`> **Nota:** ${e.nota}`);
  if (e.soluciona) lines.push(`> **Soluciona:** ${SETTINGS.hideLinkPreviews ? `<${e.soluciona}>` : e.soluciona}`);
  return lines.join('\n');
}

// Agrupa las entradas por categoría, manteniendo el orden en que aparece cada una por primera vez.
function groupByCategory(entries) {
  const order = [];
  const groups = new Map();
  for (const e of entries) {
    if (!groups.has(e.categoria)) {
      groups.set(e.categoria, []);
      order.push(e.categoria);
    }
    groups.get(e.categoria).push(e);
  }
  return order.flatMap((c) => groups.get(c));
}

export function buildMessage(data) {
  const head = [`${SETTINGS.mention} ${data.titular}`];
  if (data.paquete) head.push(`🛠️ **Paquete de arreglos nº ${data.paquete}**`);
  const blocks = [head.join('\n'), ...data.intro, data.cierre, ...groupByCategory(data.entradas).map(formatEntry)];
  return blocks.filter(Boolean).join('\n\n');
}

// Divide el mensaje en trozos de como máximo `limit` caracteres, cortando siempre
// entre bloques (párrafos o entradas). Solo si un bloque no cabe solo se corta por líneas.
export function splitMessage(markdown, limit = SETTINGS.limit) {
  const text = markdown.trim();
  if (text.length <= limit) return text ? [text] : [];

  const pieces = [];
  for (const block of text.split(/\n{2,}/)) {
    if (block.length <= limit) pieces.push(block);
    else pieces.push(...hardSplit(block, limit));
  }

  const chunks = [];
  let current = '';
  for (const piece of pieces) {
    const candidate = current ? `${current}\n\n${piece}` : piece;
    if (candidate.length <= limit) current = candidate;
    else {
      if (current) chunks.push(current);
      current = piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function hardSplit(block, limit) {
  const out = [];
  let current = '';
  for (const line of block.split('\n')) {
    if (line.length > limit) {
      if (current) out.push(current);
      for (let i = 0; i < line.length; i += limit) out.push(line.slice(i, i + limit));
      current = '';
      continue;
    }
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length <= limit) current = candidate;
    else {
      out.push(current);
      current = line;
    }
  }
  if (current) out.push(current);
  return out;
}
