import { describe, it, expect, beforeEach } from 'vitest';
import { createTestServer, ADMIN_KEY } from './helpers/server.js';

/** Simula la llamada HTTP de Netlify → doPost de Apps Script. */
function post(t, body) {
  const out = t.server.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } });
  expect(out.getMimeType()).toBe('application/json');
  return JSON.parse(out.getContent());
}

describe('doPost (frontend alojado en Netlify)', () => {
  let t;
  beforeEach(() => {
    t = createTestServer();
  });

  it('reenvía a adminApi con la llave', () => {
    const res = post(t, { fn: 'adminApi', args: ['dashboard', ADMIN_KEY, {}] });
    expect(res.ok).toBe(true);
    expect(res.data.election.status).toBe('DRAFT');
  });

  it('rechaza el panel sin la llave correcta', () => {
    expect(post(t, { fn: 'adminApi', args: ['dashboard', 'mala', {}] }).error.code).toBe('AUTH');
  });

  it('flujo de estación por HTTP: registrar y consultar estado', () => {
    const reg = post(t, { fn: 'kioskApi', args: ['register', null, { name: 'Mesa 1' }] });
    expect(reg.ok).toBe(true);
    const status = post(t, { fn: 'kioskApi', args: ['status', reg.data.token, {}] });
    expect(status.data.device.name).toBe('Mesa 1');
  });

  it('no expone funciones de editor ni internas', () => {
    for (const fn of ['setupDatabase', 'mostrarDatosAdmin', 'diagnostico', 'readTable_', 'registerVote_', 'constructor', '__proto__']) {
      expect(post(t, { fn, args: [] }).error.code).toBe('BAD_ACTION');
    }
  });

  it('responde JSON de error ante cuerpos inválidos', () => {
    expect(post(t, 'esto no es json').error.code).toBe('BAD_REQUEST');
    expect(post(t, { fn: 'kioskApi', args: 'x' }).error.code).toBe('BAD_ACTION');
    expect(JSON.parse(t.server.doPost(undefined).getContent()).ok).toBe(false);
  });
});
