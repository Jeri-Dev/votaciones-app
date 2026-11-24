import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEmptyState, createGasServices, loadServer } from '../../src/emulator/gasEmulator.js';

const GAS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'apps-script');

export function readGasSources() {
  const sources = {};
  readdirSync(GAS_DIR)
    .filter((f) => f.endsWith('.gs'))
    .forEach((f) => (sources[f] = readFileSync(join(GAS_DIR, f), 'utf8')));
  return sources;
}

export const ADMIN_KEY = 'test-admin-key-123';

/**
 * Crea un servidor emulado ya configurado (setupDatabase) con una llave de panel conocida.
 * options.activeUser permite simular un visitante anónimo ('').
 */
export function createTestServer(options = {}) {
  const holder = { state: createEmptyState() };
  holder.state.props.ADMIN_KEY = ADMIN_KEY;
  let clock = Date.now();
  const logs = [];
  const services = createGasServices(holder, {
    now: () => clock,
    onLog: (l) => logs.push(l),
    ...options,
  });
  const server = loadServer(readGasSources(), services);
  if (options.skipSetup !== true) server.setupDatabase();

  const admin = (action, payload) => server.adminApi(action, ADMIN_KEY, payload);
  const ok = (res) => {
    if (!res.ok) throw new Error(`Se esperaba ok, se obtuvo ${res.error.code}: ${res.error.message}`);
    return res.data;
  };
  return {
    server,
    holder,
    logs,
    admin,
    adminOk: (action, payload) => ok(admin(action, payload)),
    kiosk: (action, token, payload) => server.kioskApi(action, token, payload),
    kioskOk: (action, token, payload) => ok(server.kioskApi(action, token, payload)),
    advance: (ms) => (clock += ms),
    table: (name) => server.readTable_(name),
  };
}

/** Elección abierta con candidatos de ejemplo y una estación desbloqueada. */
export function openElectionWithDevice(t, name = 'Mesa 1') {
  t.adminOk('seedTestData');
  t.adminOk('setElectionStatus', { status: 'OPEN' });
  const { token } = t.kioskOk('register', null, { name });
  t.kioskOk('unlock', token);
  return token;
}

/** Selecciona el primer candidato de cada cargo. */
export function fullSelections(ballot, pick = 0) {
  const selections = {};
  ballot.categories.forEach((cat) =>
    cat.positions.forEach((pos) => (selections[pos.id] = pos.candidates[pick % pos.candidates.length].id)),
  );
  return selections;
}

export function newBallotId() {
  return globalThis.crypto.randomUUID();
}
