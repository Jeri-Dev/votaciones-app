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
  it('marca ganadores y empates', () => {
    const rows = resultsToRows({
      election: { name: 'E' },
      ballots: 2,
      categories: [
        {
          name: 'Damas',
          positions: [
            { name: 'Presidente', winnerIds: ['A', 'B'], tie: true, candidates: [{ id: 'A', name: 'Ana', votes: 1, pct: 50 }, { id: 'B', name: 'Bea', votes: 1, pct: 50 }] },
          ],
        },
      ],
    });
    expect(rows[1]).toEqual(['E', 'Damas', 'Presidente', 'Ana', 1, '50%', 'EMPATE']);
    expect(rows.at(-1)).toEqual(['Papeletas válidas', 2, '', '', '', '', '']);
  });
});
