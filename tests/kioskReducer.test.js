import { describe, it, expect } from 'vitest';
import { kioskReducer, initialKioskState } from '../src/context/kioskReducer.js';

const OPEN = { id: 'E1', name: 'Elección', status: 'OPEN' };
const dev = (status, session = 's1') => ({ id: 'EST-1', name: 'Mesa 1', status, session });
const ballot = { election: OPEN, categories: [] };

function reduce(state, ...actions) {
  return actions.reduce(kioskReducer, state);
}

const status = (device, election = OPEN) => ({ type: 'SERVER_STATUS', device, election });

describe('kioskReducer', () => {
  it('estación bloqueada en el servidor → pantalla bloqueada (recargar no la salta)', () => {
    const s = reduce(initialKioskState(false), status(dev('LOCKED')));
    expect(s.phase).toBe('locked');
  });

  it('sesión nueva → bienvenida con todo limpio', () => {
    const s = reduce(initialKioskState(false), status(dev('READY')));
    expect(s.phase).toBe('welcome');
    expect(s.session).toBe('s1');
  });

  it('flujo completo hasta el agradecimiento', () => {
    let s = reduce(initialKioskState(false), status(dev('READY')), { type: 'SET_BALLOT', ballot }, { type: 'START' });
    expect(s.phase).toBe('ballot');
    s = reduce(s, { type: 'SELECT', positionId: 'P1', candidateId: 'C1' }, { type: 'REVIEW' }, { type: 'SUBMIT_START' });
    expect(s.phase).toBe('submitting');
    s = reduce(s, { type: 'SUBMIT_SUCCESS' });
    expect(s.phase).toBe('locked');
    expect(s.justVoted).toBe(true);
    expect(s.selections).toEqual({});
  });

  it('el polling no interrumpe un envío en curso', () => {
    let s = reduce(initialKioskState(true));
    expect(s.phase).toBe('submitting');
    s = reduce(s, status(dev('LOCKED')));
    expect(s.phase).toBe('submitting');
  });

  it('reinicio remoto (nueva sesión) descarta la papeleta a medias', () => {
    let s = reduce(
      initialKioskState(false),
      status(dev('READY')),
      { type: 'SET_BALLOT', ballot },
      { type: 'START' },
      { type: 'SELECT', positionId: 'P1', candidateId: 'C1' },
    );
    s = reduce(s, status(dev('READY', 's2')));
    expect(s.phase).toBe('welcome');
    expect(s.selections).toEqual({});
  });

  it('mismo READY/VOTING en la misma sesión no interrumpe al votante', () => {
    let s = reduce(initialKioskState(false), status(dev('READY')), { type: 'SET_BALLOT', ballot }, { type: 'START' });
    s = reduce(s, status(dev('VOTING')));
    expect(s.phase).toBe('ballot');
  });

  it('pausa conserva la papeleta y la reanuda', () => {
    let s = reduce(
      initialKioskState(false),
      status(dev('VOTING')),
      { type: 'SET_BALLOT', ballot },
      { type: 'START' },
      { type: 'SELECT', positionId: 'P1', candidateId: 'C1' },
    );
    s = reduce(s, status(dev('VOTING'), { ...OPEN, status: 'PAUSED' }));
    expect(s.phase).toBe('closed');
    s = reduce(s, status(dev('VOTING')));
    expect(s.phase).toBe('ballot');
    expect(s.selections).toEqual({ P1: 'C1' });
  });

  it('bloqueo o deshabilitación desde el panel limpia las selecciones', () => {
    const base = reduce(initialKioskState(false), status(dev('READY')), { type: 'SET_BALLOT', ballot }, { type: 'START' }, { type: 'SELECT', positionId: 'P1', candidateId: 'C1' });
    expect(reduce(base, status(dev('LOCKED'))).selections).toEqual({});
    expect(reduce(base, status(dev('DISABLED'))).phase).toBe('disabled');
  });

  it('no permite seleccionar fuera de la papeleta ni enviar sin revisar', () => {
    let s = reduce(initialKioskState(false), status(dev('READY')), { type: 'SELECT', positionId: 'P1', candidateId: 'C1' });
    expect(s.selections).toEqual({});
    s = reduce(s, { type: 'SET_BALLOT', ballot }, { type: 'START' }, { type: 'SUBMIT_START' });
    expect(s.phase).toBe('ballot');
  });

  it('inactividad vuelve a la bienvenida sin selecciones', () => {
    const s = reduce(initialKioskState(false), status(dev('READY')), { type: 'SET_BALLOT', ballot }, { type: 'START' }, { type: 'SELECT', positionId: 'P1', candidateId: 'C1' }, { type: 'IDLE_RESET' });
    expect(s.phase).toBe('welcome');
    expect(s.selections).toEqual({});
  });
});
