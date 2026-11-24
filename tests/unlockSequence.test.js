import { describe, it, expect } from 'vitest';
import { createTripleTapDetector, inUnlockCorner, UNLOCK_CONFIG } from '../src/utils/unlockSequence.js';

describe('inUnlockCorner', () => {
  it('solo cuenta la esquina superior izquierda', () => {
    expect(inUnlockCorner(10, 10)).toBe(true);
    expect(inUnlockCorner(UNLOCK_CONFIG.cornerPx, UNLOCK_CONFIG.cornerPx)).toBe(true);
    expect(inUnlockCorner(UNLOCK_CONFIG.cornerPx + 1, 10)).toBe(false);
    expect(inUnlockCorner(10, 500)).toBe(false);
    expect(inUnlockCorner(1200, 10)).toBe(false);
  });
});

describe('createTripleTapDetector', () => {
  it('se completa con 3 toques seguidos en la esquina', () => {
    const d = createTripleTapDetector();
    expect([d.tap(true, 0), d.tap(true, 300), d.tap(true, 600)]).toEqual(['progress', 'progress', 'complete']);
  });

  it('una pausa larga reinicia la cuenta', () => {
    const d = createTripleTapDetector();
    d.tap(true, 0);
    d.tap(true, 300);
    expect(d.tap(true, 300 + UNLOCK_CONFIG.maxGapMs + 1)).toBe('progress');
    expect(d.count).toBe(1);
  });

  it('un toque fuera de la esquina reinicia la cuenta', () => {
    const d = createTripleTapDetector();
    d.tap(true, 0);
    d.tap(true, 200);
    expect(d.tap(false, 400)).toBe('ignored');
    expect(d.tap(true, 600)).toBe('progress');
    expect(d.count).toBe(1);
  });

  it('toques sueltos en la esquina no desbloquean', () => {
    const d = createTripleTapDetector();
    expect([d.tap(true, 0), d.tap(true, 2000), d.tap(true, 4000)]).not.toContain('complete');
  });

  it('después de completar empieza de cero', () => {
    const d = createTripleTapDetector();
    [0, 100, 200].forEach((t) => d.tap(true, t));
    expect(d.tap(true, 300)).toBe('progress');
  });
});
