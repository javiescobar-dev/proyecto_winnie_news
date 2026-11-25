// Mini renderizador del Markdown de Discord a HTML, solo para la vista previa.
// Primero se escapa TODO el HTML del texto; después se aplican las reglas.
// Así nada de lo pegado o generado puede inyectar etiquetas en la página.

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function renderInline(text) {
  const tokens = [];
  const keep = (html) => `\u0001${tokens.push(html) - 1}\u0001`;
  const link = (url, label) => keep(`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);

  let s = text
    .replace(/`([^`\n]+)`/g, (_, code) => keep(`<code>${code}</code>`))
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => link(url, label))
    .replace(/&lt;(https?:\/\/[^\s]+?)&gt;/g, (_, url) => link(url, url))
    .replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, (url) => link(url, url));

  s = s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/\*(?!\s)([^*\n]+?)\*/g, '<em>$1</em>')
    .replace(/(^|[^\p{L}\p{N}_])_(?!\s)([^_\n]+?)_(?![\p{L}\p{N}_])/gu, '$1<em>$2</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/\|\|(.+?)\|\|/g, '<span class="dc-spoiler" title="Spoiler">$1</span>')
    .replace(/@(everyone|here)\b/g, '<span class="dc-mention">@$1</span>');

  return s.replace(/\u0001(\d+)\u0001/g, (_, i) => tokens[Number(i)]);
}

export function renderDiscord(markdown) {
  const codeBlocks = [];
  const withoutCode = markdown.replace(/```(?:[\w+-]*\n)?([\s\S]*?)```/g, (_, code) => {
    codeBlocks.push(code.replace(/\n$/, ''));
    return `\u0000${codeBlocks.length - 1}\u0000`;
  });

  const lines = escapeHtml(withoutCode).split('\n');
  const html = [];
  let quote = [];
  let list = [];
  const flush = () => {
    if (quote.length) html.push(`<blockquote>${quote.join('<br>')}</blockquote>`);
    if (list.length) html.push(`<ul>${list.map((li) => `<li>${li}</li>`).join('')}</ul>`);
    quote = [];
    list = [];
  };

  for (const line of lines) {
    let m;
    if ((m = line.match(/^&gt; ?(.*)$/))) {
      if (list.length) flush();
      quote.push(renderInline(m[1]) || '&nbsp;');
      continue;
    }
    if ((m = line.match(/^\s*[-*] (.+)$/))) {
      if (quote.length) flush();
      list.push(renderInline(m[1]));
      continue;
    }
    flush();
    if ((m = line.match(/^(#{1,3}) (.+)$/))) html.push(`<h${m[1].length}>${renderInline(m[2])}</h${m[1].length}>`);
    else if ((m = line.match(/^-# (.+)$/))) html.push(`<small class="dc-subtext">${renderInline(m[1])}</small>`);
    else if (line.trim() === '') html.push('<div class="dc-blank"></div>');
    else html.push(`<div>${renderInline(line)}</div>`);
  }
  flush();

  return html
    .join('')
    .replace(/\u0000(\d+)\u0000/g, (_, i) => `<pre><code>${escapeHtml(codeBlocks[Number(i)])}</code></pre>`);
}
