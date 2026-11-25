import { describe, it, expect } from 'vitest';
import { createTestServer, openElectionWithDevice, fullSelections, newBallotId } from './helpers/server.js';
import { electionElapsedMs, formatDuration, clockOffset } from '../src/utils/elapsed.js';

describe('publicApi counter', () => {
  it('no requiere llave y solo expone el total y los tiempos (nunca resultados)', () => {
    const t = createTestServer();
    const res = t.server.publicApi('counter');
    expect(res.ok).toBe(true);
    expect(Object.keys(res.data).sort()).toEqual(['ballots', 'election', 'serverTime']);
    expect(Object.keys(res.data.election).sort()).toEqual(['closed_at', 'name', 'opened_at', 'status']);
    expect(res.data.ballots).toBe(0);
  });

  it('cuenta papeletas válidas (con caché de 5 s)', () => {
    const t = createTestServer();
    const token = openElectionWithDevice(t);
    const ballot = t.kioskOk('ballot', token);
    expect(t.server.publicApi('counter').data.ballots).toBe(0);
    t.kioskOk('submit', token, { ballotId: newBallotId(), selections: fullSelections(ballot) });
    expect(t.server.publicApi('counter').data.ballots).toBe(0); // todavía en caché
    t.advance(6000);
    const data = t.server.publicApi('counter').data;
    expect(data.ballots).toBe(1);
    expect(data.election.status).toBe('OPEN');
    expect(data.election.opened_at).toBeTruthy();
  });

  it('rechaza otras acciones y está disponible por HTTP', () => {
    const t = createTestServer();
    expect(t.server.publicApi('getResults').error.code).toBe('BAD_ACTION');
    const out = JSON.parse(t.server.doPost({ postData: { contents: JSON.stringify({ fn: 'publicApi', args: ['counter'] }) } }).getContent());
    expect(out.ok).toBe(true);
  });
});

describe('tiempo de votación', () => {
  const opened = '2026-11-25T10:00:00.000Z';
  const at = (iso) => new Date(iso).getTime();
  it('cuenta desde la apertura', () => {
    expect(formatDuration(electionElapsedMs({ status: 'OPEN', opened_at: opened }, at('2026-11-25T11:02:03.900Z')))).toBe('01:02:03');
  });
  it('queda fijo al cerrar', () => {
    const e = { status: 'CLOSED', opened_at: opened, closed_at: '2026-11-25T12:30:00.000Z' };
    expect(formatDuration(electionElapsedMs(e, at('2026-11-25T20:00:00.000Z')))).toBe('02:30:00');
  });
  it('en 0 si no ha abierto', () => {
    expect(electionElapsedMs({ status: 'DRAFT', opened_at: '' }, Date.now())).toBe(0);
  });
  it('corrige el reloj del dispositivo con la hora del servidor', () => {
    expect(clockOffset('2026-11-25T10:00:05.000Z', at('2026-11-25T10:00:00.000Z'))).toBe(5000);
  });
});
