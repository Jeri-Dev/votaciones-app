import { describe, it, expect } from 'vitest';
import { ballotProgress, initials } from '../src/utils/ballot.js';
import { csvEscape, toCsv, resultsToRows } from '../src/utils/csv.js';

const categories = [
  { id: 'CAB', name: 'Caballeros', positions: [{ id: 'CAB-PRES', name: 'Presidente', candidates: [{ id: 'C1' }, { id: 'C2' }] }] },
  { id: 'DAM', name: 'Damas', positions: [{ id: 'DAM-PRES', name: 'Presidente', candidates: [{ id: 'C3' }] }] },
];

describe('ballotProgress', () => {
  it('cuenta selecciones y lista faltantes en orden', () => {
    const p = ballotProgress(categories, { 'CAB-PRES': 'C1' });
    expect(p).toMatchObject({ total: 2, done: 1, missing: ['DAM-PRES'], complete: false });
    expect(p.byCategory.CAB).toEqual({ total: 1, done: 1 });
  });
  it('ignora selecciones con candidatos que no pertenecen al cargo', () => {
    expect(ballotProgress(categories, { 'CAB-PRES': 'C3', 'DAM-PRES': 'C3' }).complete).toBe(false);
  });
  it('completa cuando cada cargo tiene un candidato válido', () => {
    expect(ballotProgress(categories, { 'CAB-PRES': 'C2', 'DAM-PRES': 'C3' }).complete).toBe(true);
  });
});

describe('initials', () => {
  it('toma dos iniciales', () => {
    expect(initials('maría  de la Cruz')).toBe('MD');
    expect(initials('')).toBe('');
  });
});

describe('csv', () => {
  it('escapa comas, comillas y saltos de línea', () => {
    expect(csvEscape('Pérez, Juan')).toBe('"Pérez, Juan"');
    expect(csvEscape('El "Pastor"')).toBe('"El ""Pastor"""');
    expect(csvEscape(5)).toBe('5');
  });
  it('incluye BOM UTF-8 para Excel', () => {
    expect(toCsv([['a', 'b']])).toBe('﻿a,b');
  });
  it('indica el cargo obtenido (1.º y 2.º) y los empates', () => {
    const rows = resultsToRows({
      election: { name: 'E' },
      ballots: 4,
      categories: [
        {
          name: 'Damas',
          positions: [
            {
              name: 'Presidente y Vicepresidente',
              seats: [
                { role: 'Presidente', candidateIds: ['A'], tie: false },
                { role: 'Vicepresidente', candidateIds: ['B', 'C'], tie: true },
              ],
              candidates: [
                { id: 'A', name: 'Ana', votes: 2, pct: 50 },
                { id: 'B', name: 'Bea', votes: 1, pct: 25 },
                { id: 'C', name: 'Cia', votes: 1, pct: 25 },
              ],
            },
          ],
        },
      ],
    });
    expect(rows[0][6]).toBe('Cargo obtenido');
    expect(rows[1]).toEqual(['E', 'Damas', 'Presidente y Vicepresidente', 'Ana', 2, '50%', 'Presidente']);
    expect(rows[2][6]).toBe('Empate: Vicepresidente');
    expect(rows.at(-1)).toEqual(['Papeletas válidas', 4, '', '', '', '', '']);
  });
});

describe('seatSummary', () => {
  it('une un empate idéntico por los dos cargos en una sola entrada', async () => {
    const { seatSummary } = await import('../src/utils/seats.js');
    const pos = {
      candidates: [{ id: 'A', name: 'Ana' }, { id: 'B', name: 'Bea' }],
      seats: [
        { role: 'Presidente', candidateIds: ['A', 'B'], tie: true },
        { role: 'Vicepresidente', candidateIds: ['A', 'B'], tie: true },
      ],
    };
    const s = seatSummary(pos);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ role: 'Presidente / Vicepresidente', names: ['Ana', 'Bea'], merged: true });
  });
});
