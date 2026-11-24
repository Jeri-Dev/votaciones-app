import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Detecta inactividad. Tras warnMs muestra aviso (warning=true); tras timeoutMs llama onTimeout.
 * Cualquier toque o desplazamiento reinicia el contador.
 */
export function useIdleTimer({ warnMs, timeoutMs, onTimeout, enabled }) {
  const [warning, setWarning] = useState(false);
  const timers = useRef([]);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const reset = useCallback(() => {
    clear();
    setWarning(false);
    if (!enabled) return;
    timers.current = [
      setTimeout(() => setWarning(true), warnMs),
      setTimeout(() => {
        setWarning(false);
        onTimeoutRef.current();
      }, timeoutMs),
    ];
  }, [enabled, warnMs, timeoutMs]);

  useEffect(() => {
    reset();
    if (!enabled) return clear;
    const events = ['pointerdown', 'keydown', 'scroll', 'touchmove'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true, capture: true }));
    return () => {
      clear();
      events.forEach((e) => window.removeEventListener(e, reset, { capture: true }));
    };
  }, [enabled, reset]);

  return { warning, reset };
}
