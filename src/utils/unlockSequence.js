// Gesto para habilitar la estación: 3 toques seguidos en la esquina superior izquierda.
// No hay ninguna señal visual; un toque fuera de la esquina o una pausa larga reinicia la cuenta.

export const UNLOCK_CONFIG = {
  taps: 3, // toques necesarios
  cornerPx: 160, // tamaño del cuadrado sensible en la esquina superior izquierda
  maxGapMs: 700, // tiempo máximo entre un toque y el siguiente
};

export function inUnlockCorner(x, y, cornerPx = UNLOCK_CONFIG.cornerPx) {
  return x >= 0 && y >= 0 && x <= cornerPx && y <= cornerPx;
}

/**
 * Máquina de estados pura (el tiempo se inyecta, así se puede probar).
 * tap() devuelve: 'ignored' | 'progress' | 'complete'.
 */
export function createTripleTapDetector(config = UNLOCK_CONFIG) {
  const { taps, maxGapMs } = config;
  let count = 0;
  let lastAt = -Infinity;

  return {
    tap(inCorner, now) {
      if (!inCorner) {
        count = 0;
        return 'ignored';
      }
      if (now - lastAt > maxGapMs) count = 0;
      count += 1;
      lastAt = now;
      if (count >= taps) {
        count = 0;
        lastAt = -Infinity;
        return 'complete';
      }
      return 'progress';
    },
    get count() {
      return count;
    },
  };
}
