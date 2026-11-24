import { useEffect, useRef } from 'react';

/**
 * Ejecuta fn de inmediato y luego cada intervalMs, sin solapar llamadas.
 * Se pausa mientras la pestaña está oculta y se reanuda al volver.
 */
export function usePolling(fn, intervalMs, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled || !intervalMs) return undefined;
    let cancelled = false;
    let timer = null;

    const tick = async () => {
      timer = null;
      if (cancelled) return;
      if (document.visibilityState !== 'hidden') {
        try {
          await fnRef.current();
        } catch {
          /* el llamador maneja sus errores */
        }
      }
      if (!cancelled) timer = setTimeout(tick, intervalMs);
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible' && timer) {
        clearTimeout(timer);
        tick();
      }
    };

    tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs, enabled]);
}
