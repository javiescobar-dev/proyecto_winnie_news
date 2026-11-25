# proyecto_winnie_news
Proyecto de prueba para integrar la IA y generar noticias para discord

**Winnie News** convierte el texto en bruto de una compilación de NaerZone (copiado del foro) en:

1. Un anuncio de Discord con el formato de los "Paquetes de arreglos", listo para copiar y pegar.
2. Una imagen generada a partir del contenido.

## Cómo funciona

```
Texto del foro ──► limpieza y filtrado (código) ──► diccionario EN→ES (código) ──► Groq / Llama 3 (JSON)
                                                                                         │
       Vista previa estilo Discord ◄── formato Markdown (public/formatter.js) ◄──────────┘
       Imagen ◄── Cloudflare Workers AI / Hugging Face ◄── prompt de imagen (editable)
```

- **Filtrado en código, no por la IA:** solo pasan las entradas marcadas como `(Funciona correctamente)`. Las demás se muestran en un aviso como excluidas.
- **Limpieza:** se quitan la firma del foro, "Compartir", "APLICADO EN…", y las versiones y fechas de cada entrada.
- **Diccionario** (`data/dictionary.json`): sustituye los nombres en inglés por `Español (English)`. Si un nombre no está, se deja tal cual; si el archivo está roto, la app sigue funcionando sin traducciones.
- **IA de texto:** devuelve datos (titular, intro, entradas, créditos, notas, enlaces), no Markdown. El formato del mensaje se cambia en `public/formatter.js` sin tocar el prompt.
- **Mensajes de más de 4000 caracteres** (límite de Discord con Nitro): se dividen en varios mensajes sin cortar entradas, con un botón de copiar para cada uno.

## Estructura

| Ruta | Qué hay |
|---|---|
| `api/` | Funciones serverless: `login`, `generate-text`, `generate-image` |
| `lib/` | Lógica del servidor: autenticación, limpieza, diccionario, prompts y configuración |
| `lib/providers/` | Un archivo por proveedor de IA, todos con la misma interfaz |
| `data/dictionary.json` | Diccionario de nombres inglés→español |
| `public/` | La web (HTML, CSS y JS sin frameworks) |
| `scripts/` | Servidor local, generador del hash y prueba de la limpieza |
| `samples/` | Compilaciones de ejemplo para probar |

## Puesta en marcha en local

Requisitos: Node 20 o superior.

```bash
npm install
cp .env.example .env                 # y rellénalo (ver abajo)
npm run hash -- "la-contraseña"      # genera APP_PASSWORD_HASH y SESSION_SECRET para el .env
npm run dev                          # http://localhost:3000
```

Para probar solo la limpieza y el diccionario, sin IA:

```bash
npm run try -- samples/compilacion-158.txt
```

### Claves necesarias

| Variable | Dónde se consigue |
|---|---|
| `GROQ_API_KEY` | https://console.groq.com/keys (gratis) |
| `CF_ACCOUNT_ID` | Panel de Cloudflare → Workers AI (o el ID que aparece en la URL del panel) |
| `CF_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token → plantilla **Workers AI** |
| `APP_PASSWORD_HASH`, `SESSION_SECRET` | `npm run hash -- "la-contraseña"` |

Opcionales: `GROQ_MODEL`, `CF_IMAGE_MODEL`, `IMAGE_PROVIDER=huggingface` + `HF_API_TOKEN`. Ver `.env.example`.

## Despliegue en Vercel

1. En https://vercel.com, entra con la cuenta de GitHub **javiescobar-dev** → *Add New → Project* → importa `proyecto_winnie_news`.
2. *Framework Preset*: **Other**. No hace falta *Build Command*; Vercel sirve `public/` y convierte `api/` en funciones.
3. En *Environment Variables*, añade las mismas variables del `.env`. Pega los valores **sin** las comillas simples.
4. Despliega. Cada `git push` a `main` vuelve a desplegar automáticamente.

## Cambiar de modelo o de proveedor

- **Otro modelo de Groq:** `GROQ_MODEL=...`.
- **Otro modelo de imagen en Cloudflare:** `CF_IMAGE_MODEL=...`.
- **Hugging Face en lugar de Cloudflare:** `IMAGE_PROVIDER=huggingface`.
- **Proveedor nuevo:** crea `lib/providers/text/<nombre>.js` (con `generateJSON`) o `lib/providers/image/<nombre>.js` (con `generateImage`), regístralo en `lib/providers/index.js` y selecciónalo con `TEXT_PROVIDER` o `IMAGE_PROVIDER`.

## Ajustes habituales

- **Añadir traducciones:** edita `data/dictionary.json`. El formato está explicado en el propio archivo.
- **Tono y reglas de redacción:** `lib/prompts.js` (`NEWS_SYSTEM_PROMPT`).
- **Estilo de las imágenes:** `lib/prompts.js` (`IMAGE_STYLE`).
- **Formato del mensaje** (negritas, mención, límite de caracteres, enlaces sin vista previa): `public/formatter.js` (`SETTINGS` y `formatEntry`).
- **Ruido del foro que no se limpia:** añade un patrón a `NOISE_PATTERNS` en `lib/preprocess.js`.

## Límites de los planes gratuitos

- **Groq:** tiene un límite de tokens por minuto. Una compilación muy larga, o varias generaciones seguidas, puede dar el aviso "espera un minuto".
- **Cloudflare Workers AI:** tiene una cuota diaria gratuita. Si se agota, se renueva al día siguiente.
- **Flux-1-schnell en Cloudflare:** siempre genera imágenes cuadradas de 1024×1024.
