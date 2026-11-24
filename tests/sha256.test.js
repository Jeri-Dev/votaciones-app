import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { sha256Bytes } from '../src/emulator/sha256.js';

describe('sha256 del emulador', () => {
  it.each(['', 'abc', 'Elección ñandú 🙂', 'x'.repeat(1000)])('coincide con node:crypto para %#', (text) => {
    const expected = createHash('sha256').update(text, 'utf8').digest('hex');
    const actual = sha256Bytes(text).map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(actual).toBe(expected);
  });
});
