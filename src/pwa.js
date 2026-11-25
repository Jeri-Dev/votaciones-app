// PWA: registro del service worker, instalación y pantalla siempre encendida.
import { useCallback, useEffect, useState } from 'react';
import { isGasHosted } from './services/googleScript.js';

/**
 * Registra el service worker solo en el sitio publicado (p. ej. Netlify).
 * No en desarrollo (evita cachés viejas) ni dentro de Apps Script (el iframe no lo permite).
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || isGasHosted() || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('No se pudo registrar el service worker', err));
  });
}

/** true si la app ya corre instalada (pantalla completa / standalone). */
export function isInstalled() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  );
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// El evento puede llegar antes de que React monte el componente: se guarda aquí.
let deferredPrompt = null;
const listeners = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((fn) => fn());
  });
}

/**
 * Estado de instalación:
 *  - mode 'prompt'   → Android/Chrome/Edge: hay un botón "Instalar" disponible.
 *  - mode 'ios'      → iPhone/iPad: hay que usar Compartir → "Agregar a inicio".
 *  - mode 'installed'/'unavailable'
 */
export function useInstallPrompt() {
  const [, force] = useState(0);
  useEffect(() => {
    const update = () => force((n) => n + 1);
    listeners.add(update);
    return () => listeners.delete(update);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    force((n) => n + 1);
    return outcome === 'accepted';
  }, []);

  let mode = 'unavailable';
  if (isGasHosted()) mode = 'unavailable';
  else if (isInstalled()) mode = 'installed';
  else if (deferredPrompt) mode = 'prompt';
  else if (isIos()) mode = 'ios';
  return { mode, install };
}

/**
 * Mantiene la pantalla encendida mientras la estación de votación está abierta
 * (Screen Wake Lock API). El navegador lo suelta al ocultar la pestaña; se vuelve a pedir
 * al regresar. Si el navegador no lo soporta, no pasa nada.
 */
export function useWakeLock(enabled = true) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return undefined;
    let sentinel = null;
    let cancelled = false;
    const request = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        /* p. ej. batería baja o permiso denegado */
      }
    };
    const onVisible = () => document.visibilityState === 'visible' && request();
    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      sentinel?.release().catch(() => {});
    };
  }, [enabled]);
}
