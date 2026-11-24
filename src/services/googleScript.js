// Puente con Apps Script. En producción usa google.script.run; en `npm run dev`
// usa el backend emulado (el mismo código .gs ejecutándose en el navegador).

export class ApiError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = 'ApiError';
    this.code = code;
  }
}

/** Errores en los que es seguro reintentar (los envíos son idempotentes). */
export const RETRYABLE_CODES = ['NETWORK', 'BUSY', 'INTERNAL'];

export const isRetryable = (err) => RETRYABLE_CODES.includes(err?.code);

const gasRun = () => (typeof google !== 'undefined' && google.script && google.script.run) || null;

/** URL /exec de la app web de Apps Script cuando el frontend vive fuera de Google (Netlify). */
const GAS_URL = import.meta.env.VITE_GAS_URL || '';
const HTTP_TIMEOUT_MS = 30000;

/** true si la página la sirve el propio Apps Script (HtmlService). */
export const isGasHosted = () => Boolean(gasRun());

async function postToGas(fn, args) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    // text/plain = "simple request": el navegador no envía preflight CORS (Apps Script no lo responde).
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fn, args }),
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function runRaw(fn, args) {
  const run = gasRun();
  if (run) {
    return new Promise((resolve, reject) => {
      run.withSuccessHandler(resolve).withFailureHandler(reject)[fn](...args);
    });
  }
  if (GAS_URL) return postToGas(fn, args);
  if (import.meta.env.DEV) {
    return import('./mockBackend.js').then((m) => m.mockCall(fn, args));
  }
  return Promise.reject(new Error('Falta configurar VITE_GAS_URL'));
}

export async function callServer(fn, ...args) {
  let envelope;
  try {
    envelope = await runRaw(fn, args);
  } catch (err) {
    throw new ApiError('NETWORK', 'No hay conexión con el servidor.', { cause: err });
  }
  if (!envelope || typeof envelope !== 'object') {
    throw new ApiError('INTERNAL', 'Respuesta inválida del servidor.');
  }
  if (!envelope.ok) throw new ApiError(envelope.error.code, envelope.error.message);
  return envelope.data;
}

/** Parámetros de la URL de la app (?view=admin&key=...). */
export function getLocation() {
  if (typeof google !== 'undefined' && google.script && google.script.url) {
    return new Promise((resolve) => google.script.url.getLocation((loc) => resolve(loc)));
  }
  const parameter = Object.fromEntries(new URLSearchParams(window.location.search));
  return Promise.resolve({ parameter, hash: window.location.hash.replace(/^#/, '') });
}

/** Abre un enlace fuera del iframe de Apps Script. */
export function openExternal(url) {
  window.open(url, '_blank', 'noopener');
}
