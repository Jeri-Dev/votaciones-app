import { useCallback, useRef } from 'react';
import { createTripleTapDetector, inUnlockCorner, UNLOCK_CONFIG } from '../utils/unlockSequence.js';

/**
 * Devuelve un handler de onPointerDown para una capa a pantalla completa.
 * Llama onComplete tras 3 toques seguidos en la esquina superior izquierda.
 */
export function useUnlockSequence(onComplete, config = UNLOCK_CONFIG) {
  const detector = useRef(null);
  if (!detector.current) detector.current = createTripleTapDetector(config);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  return useCallback(
    (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const inCorner = inUnlockCorner(event.clientX - rect.left, event.clientY - rect.top, config.cornerPx);
      if (detector.current.tap(inCorner, Date.now()) === 'complete') onCompleteRef.current();
    },
    [config.cornerPx],
  );
}
