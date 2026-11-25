// Lógica de la interfaz: sesión, llamadas a /api, vista previa, edición, copiar y descargar.
// No conoce a ningún proveedor de IA: solo habla con /api/generate-text y /api/generate-image.
import { buildMessage, splitMessage, SETTINGS } from './formatter.js';
import { renderDiscord } from './discord-render.js';

const $ = (id) => document.getElementById(id);
const TOKEN_KEY = 'winnie-news-token';

// sessionStorage puede fallar (modo privado, bloqueado...): la app sigue funcionando sin él.
const session = {
  get: () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (v) => { try { sessionStorage.setItem(TOKEN_KEY, v); } catch { /* sin persistencia */ } },
  clear: () => { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* nada */ } },
};

const state = {
  token: session.get(),
  data: null,
  markdown: '',
  chunks: [],
  image: null, // { src, mime }
  busyText: false,
  busyImage: false,
  mode: 'preview',
};

// ---------- API ----------
async function api(path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(`/api/${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  let json = {};
  try { json = await res.json(); } catch { /* respuesta vacía */ }
  if (res.status === 401 && path !== 'login') {
    logout('La sesión ha caducado. Vuelve a entrar.');
  }
  if (!res.ok) {
    const error = new Error(json.error || `Error ${res.status}`);
    error.payload = json;
    throw error;
  }
  return json;
}

// ---------- Sesión ----------
function showScreen() {
  $('login-screen').hidden = Boolean(state.token);
  $('app-screen').hidden = !state.token;
  if (!state.token) $('password').focus();
}

async function login(event) {
  event.preventDefault();
  const button = $('login-btn');
  $('login-error').textContent = '';
  button.disabled = true;
  try {
    const { token } = await api('login', { password: $('password').value });
    state.token = token;
    session.set(token);
    $('password').value = '';
    showScreen();
  } catch (err) {
    $('login-error').textContent = err.message;
  } finally {
    button.disabled = false;
  }
}

function logout(message = '') {
  state.token = null;
  session.clear();
  $('login-error').textContent = message;
  showScreen();
}

// ---------- Estado visible ----------
function setStatus(text, kind = 'busy') {
  const el = $('status');
  el.className = `status ${kind === 'busy' ? '' : kind}`;
  el.innerHTML = '';
  if (!text) return;
  if (kind === 'busy') el.insertAdjacentHTML('beforeend', '<span class="spinner" aria-hidden="true"></span>');
  el.append(text);
}

function updateButtons() {
  const busy = state.busyText || state.busyImage;
  $('generate').disabled = busy;
  $('regen-text').disabled = busy || !$('raw').value.trim();
  $('regen-image').disabled = state.busyImage || !$('image-prompt').value.trim();
  $('download').disabled = !state.image || state.busyImage;
}

function addNotice(title, items = []) {
  const box = document.createElement('div');
  box.className = 'notice';
  const strong = document.createElement('strong');
  strong.textContent = title;
  box.append(strong);
  if (items.length) {
    const ul = document.createElement('ul');
    for (const item of items) {
      const li = document.createElement('li');
      li.textContent = item;
      ul.append(li);
    }
    box.append(ul);
  }
  $('notices').append(box);
}

function showNotices(result) {
  $('notices').innerHTML = '';
  const excluded = result?.excluded ?? [];
  if (excluded.length) {
    addNotice(
      `Se ${excluded.length === 1 ? 'ha excluido 1 entrada' : `han excluido ${excluded.length} entradas`} que no está${excluded.length === 1 ? '' : 'n'} marcada${excluded.length === 1 ? '' : 's'} como «Funciona correctamente»:`,
      excluded.map((e) => `[${e.category}] (${e.status}) ${e.summary}`),
    );
  }
  if (result?.data && result.expectedEntries && result.data.entradas.length !== result.expectedEntries) {
    addNotice(
      `Atención: la compilación tiene ${result.expectedEntries} entradas válidas, pero la IA ha devuelto ${result.data.entradas.length}. Revisa el texto o regenéralo.`,
    );
  }
}

// ---------- Vista previa ----------
const now = () => new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

function attachmentHtml() {
  if (state.busyImage) {
    return '<div class="dc-attachment loading"><span class="spinner" aria-hidden="true"></span>Creando imagen…</div>';
  }
  if (state.image) return `<img class="dc-attachment" src="${state.image.src}" alt="Imagen generada para la noticia">`;
  return '';
}

function messageHtml(chunk, index, total) {
  const isLast = index === total - 1;
  const label = total > 1 ? `📋 Copiar ${index + 1}/${total}` : '📋 Copiar texto';
  const copy = chunk ? `<button class="btn small dc-copy" data-chunk="${index}">${label}</button>` : '';
  return `
    <article class="dc-message">
      <div class="dc-avatar" aria-hidden="true">W</div>
      <div>
        <header class="dc-header">
          <span class="dc-author">Winnie</span><span class="dc-role">Admin</span>
          <time>Hoy a las ${now()}</time>${copy}
        </header>
        <div class="dc-content">${chunk ? renderDiscord(chunk) : ''}</div>
        ${isLast ? attachmentHtml() : ''}
      </div>
    </article>`;
}

function renderPreview() {
  state.chunks = splitMessage(state.markdown, SETTINGS.limit);
  const total = state.chunks.length;

  const counter = $('counter');
  if (state.markdown) {
    counter.textContent = `${state.markdown.length} caracteres · ${total} mensaje${total === 1 ? '' : 's'} (límite ${SETTINGS.limit})`;
    counter.classList.toggle('warn', total > 1);
  } else {
    counter.textContent = '';
  }

  const preview = $('preview');
  if (!total && !state.image && !state.busyImage) {
    preview.innerHTML = '<p class="dc-empty">Aquí verás la noticia tal y como quedará en Discord.</p>';
  } else {
    const chunks = total ? state.chunks : [''];
    preview.innerHTML = chunks.map((c, i) => messageHtml(c, i, chunks.length)).join('');
  }
  updateButtons();
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.tab').forEach((tab) => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  $('editor').hidden = mode !== 'edit';
  if (mode === 'edit') $('editor').focus();
}

// ---------- Acciones ----------
async function generateText() {
  const raw = $('raw').value;
  if (!raw.trim()) {
    setStatus('Pega primero el texto de la compilación.', 'error');
    return false;
  }
  state.busyText = true;
  updateButtons();
  setStatus('Redactando la noticia…');
  try {
    const result = await api('generate-text', { raw });
    state.data = result.data;
    state.markdown = buildMessage(result.data);
    $('editor').value = state.markdown;
    $('image-prompt').value = result.imagePrompt || '';
    showNotices(result);
    setStatus('Texto listo.', 'ok');
    return true;
  } catch (err) {
    setStatus(err.message, 'error');
    if (err.payload) showNotices(err.payload);
    return false;
  } finally {
    state.busyText = false;
    renderPreview();
  }
}

async function generateImage() {
  const prompt = $('image-prompt').value.trim();
  if (!prompt) return;
  state.busyImage = true;
  renderPreview();
  setStatus('Creando la imagen…');
  try {
    const { imageBase64, mime } = await api('generate-image', { prompt });
    state.image = { src: `data:${mime};base64,${imageBase64}`, mime };
    setStatus('¡Noticia lista! ✅', 'ok');
  } catch (err) {
    setStatus(`Imagen: ${err.message}`, 'error');
  } finally {
    state.busyImage = false;
    renderPreview();
  }
}

async function generateAll() {
  if (await generateText()) await generateImage();
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Alternativa para navegadores sin acceso al portapapeles
    const area = document.createElement('textarea');
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  const original = button.textContent;
  button.textContent = '✅ ¡Copiado!';
  setTimeout(() => { button.textContent = original; }, 1500);
}

async function downloadImage() {
  if (!state.image) return;
  const blob = await (await fetch(state.image.src)).blob();
  const ext = { 'image/png': 'png', 'image/webp': 'webp' }[state.image.mime] || 'jpg';
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `paquete-de-arreglos-${state.data?.paquete ?? 'noticia'}.${ext}`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// ---------- Eventos ----------
$('login-form').addEventListener('submit', login);
$('logout').addEventListener('click', () => logout());
$('generate').addEventListener('click', generateAll);
$('regen-text').addEventListener('click', generateText);
$('regen-image').addEventListener('click', generateImage);
$('download').addEventListener('click', downloadImage);
$('raw').addEventListener('input', updateButtons);
$('image-prompt').addEventListener('input', updateButtons);
$('editor').addEventListener('input', () => {
  state.markdown = $('editor').value;
  renderPreview();
});
document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
$('preview').addEventListener('click', (event) => {
  const copy = event.target.closest('.dc-copy');
  if (copy) return copyText(state.chunks[Number(copy.dataset.chunk)], copy);
  const spoiler = event.target.closest('.dc-spoiler');
  if (spoiler) spoiler.classList.toggle('revealed');
});

showScreen();
renderPreview();
