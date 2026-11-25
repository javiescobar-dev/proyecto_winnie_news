// Toda la configuración sale de variables de entorno. Para cambiar de modelo o de
// proveedor basta con cambiarlas en Vercel (o en .env en local); el código no se toca.
// Se lee en cada llamada para que el servidor local recoja los cambios de .env sin trucos.

export function getConfig() {
  const env = process.env;
  return {
    textProvider: env.TEXT_PROVIDER || 'groq',
    imageProvider: env.IMAGE_PROVIDER || 'cloudflare',

    groq: {
      apiKey: env.GROQ_API_KEY,
      model: env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    },

    cloudflare: {
      accountId: env.CF_ACCOUNT_ID,
      apiToken: env.CF_API_TOKEN,
      model: env.CF_IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell',
    },

    huggingface: {
      token: env.HF_API_TOKEN,
      model: env.HF_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell',
      // Endpoint de Inference Providers; {model} se sustituye por el modelo.
      endpoint: env.HF_ENDPOINT || 'https://router.huggingface.co/hf-inference/models/{model}',
    },

    image: {
      width: Number(env.IMAGE_WIDTH) || 1024,
      height: Number(env.IMAGE_HEIGHT) || 576,
    },

    limits: {
      maxInputChars: 30000,
      maxImagePromptChars: 1500,
    },
  };
}
