import { describe, it, expect, beforeEach } from 'vitest';
import { createTestServer, openElectionWithDevice, fullSelections, newBallotId, ADMIN_KEY } from './helpers/server.js';

describe('setupDatabase', () => {
  it('crea todas las hojas, 3 directivas y 12 cargos', () => {
    const t = createTestServer();
    expect(Object.keys(t.holder.state.sheets).sort()).toEqual(
      ['AuditLog', 'Candidates', 'Categories', 'Devices', 'Elections', 'Positions', 'Votes'],
    );
    expect(t.table('Categories').map((c) => c.name)).toEqual(['Caballeros', 'Damas', 'Jóvenes']);
    expect(t.table('Positions')).toHaveLength(12);
    expect(t.table('Elections')[0].status).toBe('DRAFT');
  });


  it('es idempotente: ejecutarlo otra vez no duplica ni borra datos', () => {
    const t = createTestServer();
    t.adminOk('seedTestData');
    t.server.setupDatabase();
    expect(t.table('Positions')).toHaveLength(12);
    expect(t.table('Elections')).toHaveLength(1);
    expect(t.table('Candidates')).toHaveLength(36);
  });

  it('no puede ejecutarse desde la web por un visitante anónimo', () => {
    const t = createTestServer({ activeUser: '', skipSetup: true });
    expect(() => t.server.setupDatabase()).toThrow(/editor/);
  });
});

describe('seguridad del panel', () => {
  it('rechaza llamadas sin la llave correcta y lo registra', () => {
    const t = createTestServer();
    const res = t.server.adminApi('getResults', 'llave-falsa', {});
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('AUTH');
    expect(t.table('AuditLog').some((l) => l.action === 'ACCESS_DENIED')).toBe(true);
  });

  it('rechaza acciones que no están en la lista blanca', () => {
    const t = createTestServer();
    expect(t.server.adminApi('setupDatabase', ADMIN_KEY).error.code).toBe('BAD_ACTION');
    expect(t.server.kioskApi('getResults', 'x').error.code).toBe('BAD_ACTION');
    expect(t.server.kioskApi('constructor', 'x').error.code).toBe('BAD_ACTION');
  });
});

describe('estaciones', () => {
  let t;
  beforeEach(() => {
    t = createTestServer();
  });

  it('registro con solo el nombre y guarda solo el hash del token', () => {
    expect(t.kiosk('register', null, { name: '   ' }).error.code).toBe('VALIDATION');
    const { token, device } = t.kioskOk('register', null, { name: 'Mesa 1' });
    expect(device.status).toBe('LOCKED');
    const row = t.table('Devices')[0];
    expect(row.token_hash).not.toBe(token);
    expect(row.token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('desbloquear requiere el token de la estación', () => {
    t.kioskOk('register', null, { name: 'Mesa 1' });
    expect(t.kiosk('unlock', 'token-falso-de-mas-de-32-caracteres-xxxxx').error.code).toBe('UNREGISTERED');
    expect(t.kiosk('unlock', null).error.code).toBe('UNREGISTERED');
  });

  it('el id del dispositivo no sirve como credencial', () => {
    const { device } = t.kioskOk('register', null, { name: 'Mesa 1' });
    expect(t.kiosk('status', device.id).error.code).toBe('UNREGISTERED');
  });


  it('máximo 10 estaciones activas', () => {
    for (let i = 0; i < 10; i++) t.kioskOk('register', null, { name: `Mesa ${i}` });
    expect(t.kiosk('register', null, { name: 'Mesa 11' }).error.code).toBe('CONFLICT');
  });

  it('cada desbloqueo genera una sesión nueva', () => {
    const { token } = t.kioskOk('register', null, { name: 'Mesa 1' });
    const a = t.kioskOk('unlock', token).device.session;
    const b = t.kioskOk('unlock', token).device.session;
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it('una estación deshabilitada no puede desbloquearse desde la tablet', () => {
    const { token, device } = t.kioskOk('register', null, { name: 'Mesa 1' });
    t.adminOk('disableDevice', { id: device.id });
    expect(t.kiosk('unlock', token).error.code).toBe('DEVICE_DISABLED');
  });

  it('el estado de la estación nunca incluye resultados', () => {
    const token = openElectionWithDevice(t);
    const status = t.kioskOk('status', token);
    expect(Object.keys(status).sort()).toEqual(['device', 'election']);
  });
});

describe('votación', () => {
  let t;
  let token;
  let ballot;
  beforeEach(() => {
    t = createTestServer();
    token = openElectionWithDevice(t);
    ballot = t.kioskOk('ballot', token);
  });

  it('la papeleta tiene 3 directivas × 4 cargos', () => {
    expect(ballot.categories).toHaveLength(3);
    ballot.categories.forEach((c) => expect(c.positions).toHaveLength(4));
  });

  it('registra 12 filas con el mismo ballot_id y bloquea la estación', () => {
    const ballotId = newBallotId();
    const res = t.kioskOk('submit', token, { ballotId, electionId: ballot.election.id, selections: fullSelections(ballot) });
    expect(res).toEqual({ registered: true, duplicate: false });
    const votes = t.table('Votes');
    expect(votes).toHaveLength(12);
    expect(new Set(votes.map((v) => v.ballot_id))).toEqual(new Set([ballotId]));
    expect(t.kioskOk('status', token).device.status).toBe('LOCKED');
  });

  it('reintento con el mismo ballot_id no duplica votos', () => {
    const payload = { ballotId: newBallotId(), selections: fullSelections(ballot) };
    t.kioskOk('submit', token, payload);
    const again = t.kioskOk('submit', token, payload);
    expect(again.duplicate).toBe(true);
    expect(t.table('Votes')).toHaveLength(12);
  });

  it('una estación bloqueada no puede votar otra papeleta', () => {
    t.kioskOk('submit', token, { ballotId: newBallotId(), selections: fullSelections(ballot) });
    const res = t.kiosk('submit', token, { ballotId: newBallotId(), selections: fullSelections(ballot, 1) });
    expect(res.error.code).toBe('DEVICE_NOT_READY');
    expect(t.table('Votes')).toHaveLength(12);
  });

  it('rechaza papeletas incompletas', () => {
    const selections = fullSelections(ballot);
    delete selections['JOV-TESO'];
    const res = t.kiosk('submit', token, { ballotId: newBallotId(), selections });
    expect(res.error.code).toBe('VALIDATION');
    expect(t.table('Votes')).toHaveLength(0);
  });

  it('rechaza un candidato de otro cargo', () => {
    const selections = fullSelections(ballot);
    selections['CAB-PRES'] = selections['DAM-PRES'];
    expect(t.kiosk('submit', token, { ballotId: newBallotId(), selections }).error.code).toBe('VALIDATION');
  });

  it('rechaza cargos desconocidos y ballot_id inválido', () => {
    const selections = { ...fullSelections(ballot), 'XXX-PRES': 'C1' };
    expect(t.kiosk('submit', token, { ballotId: newBallotId(), selections }).error.code).toBe('VALIDATION');
    expect(t.kiosk('submit', token, { ballotId: 'corto', selections: fullSelections(ballot) }).error.code).toBe('VALIDATION');
  });

  it('no permite votar con la elección en pausa', () => {
    t.adminOk('setElectionStatus', { status: 'PAUSED' });
    const res = t.kiosk('submit', token, { ballotId: newBallotId(), selections: fullSelections(ballot) });
    expect(res.error.code).toBe('ELECTION_NOT_OPEN');
  });

  it('no guarda dispositivo ni hora exacta en Votes', () => {
    t.kioskOk('submit', token, { ballotId: newBallotId(), selections: fullSelections(ballot) });
    const vote = t.table('Votes')[0];
    expect(Object.keys(vote).filter((k) => k !== '_row')).toEqual(
      ['vote_id', 'ballot_id', 'election_id', 'category_id', 'position_id', 'candidate_id', 'created_at'],
    );
    expect(vote.created_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const audit = t.table('AuditLog').filter((l) => l.action === 'BALLOT_CAST');
    expect(audit).toHaveLength(1);
    expect(audit[0].detail).toBe('');
  });

  it('inserta papeletas en posición aleatoria pero siempre contiguas', () => {
    const ids = [];
    for (let i = 0; i < 25; i++) {
      t.kioskOk('unlock', token);
      const ballotId = newBallotId();
      ids.push(ballotId);
      t.kioskOk('submit', token, { ballotId, selections: fullSelections(ballot, i) });
    }
    const order = t.table('Votes').map((v) => v.ballot_id);
    expect(order).toHaveLength(300);
    // Contiguas: cada papeleta ocupa un bloque de 12 filas.
    for (let i = 0; i < order.length; i += 12) {
      expect(new Set(order.slice(i, i + 12)).size).toBe(1);
    }
    const sheetOrder = order.filter((_, i) => i % 12 === 0);
    expect(sheetOrder).not.toEqual(ids); // probabilidad de falso positivo ≈ 1/25!
  });

  it('reiniciar, bloquear o deshabilitar estaciones nunca toca los votos', () => {
    t.kioskOk('submit', token, { ballotId: newBallotId(), selections: fullSelections(ballot) });
    const before = JSON.stringify(t.table('Votes'));
    const id = t.table('Devices')[0].id;
    t.adminOk('resetDevice', { id });
    t.adminOk('lockDevice', { id });
    t.adminOk('activateDevice', { id });
    t.adminOk('disableDevice', { id });
    t.adminOk('setElectionStatus', { status: 'CLOSED' });
    t.adminOk('createElection', { name: 'Nueva', copyCandidates: true });
    expect(JSON.stringify(t.table('Votes'))).toBe(before);
  });
});

describe('elección y candidatos', () => {
  let t;
  beforeEach(() => {
    t = createTestServer();
  });

  it('no abre la votación si faltan candidatos', () => {
    const res = t.admin('setElectionStatus', { status: 'OPEN' });
    expect(res.error.code).toBe('VALIDATION');
    expect(res.error.message).toMatch(/Presidente/);
  });

  it('CRUD de candidatos solo en DRAFT', () => {
    const { id } = t.adminOk('createCandidate', { name: '  Ana  ', positionId: 'DAM-SECR' });
    const created = t.table('Candidates').find((c) => c.id === id);
    expect(created.name).toBe('Ana');
    expect(created.category_id).toBe('DAM');
    t.adminOk('updateCandidate', { id, name: 'Ana María' });
    t.adminOk('deleteCandidate', { id });
    expect(t.table('Candidates')).toHaveLength(0);

    t.adminOk('seedTestData');
    t.adminOk('setElectionStatus', { status: 'OPEN' });
    const someId = t.table('Candidates')[0].id;
    expect(t.admin('updateCandidate', { id: someId, name: 'X' }).error.code).toBe('CONFLICT');
    expect(t.admin('deleteCandidate', { id: someId }).error.code).toBe('CONFLICT');
    expect(t.admin('createCandidate', { name: 'X', positionId: 'CAB-PRES' }).error.code).toBe('CONFLICT');
  });

  it('valida cargo y enlace de foto', () => {
    expect(t.admin('createCandidate', { name: 'X', positionId: 'NOPE' }).error.code).toBe('VALIDATION');
    expect(t.admin('createCandidate', { name: 'X', positionId: 'CAB-PRES', photoUrl: 'javascript:alert(1)' }).error.code).toBe('VALIDATION');
    expect(t.admin('createCandidate', { name: '', positionId: 'CAB-PRES' }).error.code).toBe('VALIDATION');
  });

  it('transiciones válidas de estado y CLOSED es final', () => {
    t.adminOk('seedTestData');
    expect(t.admin('setElectionStatus', { status: 'CLOSED' }).error.code).toBe('CONFLICT');
    t.adminOk('setElectionStatus', { status: 'OPEN' });
    t.adminOk('setElectionStatus', { status: 'PAUSED' });
    t.adminOk('setElectionStatus', { status: 'OPEN' });
    t.adminOk('setElectionStatus', { status: 'CLOSED' });
    expect(t.admin('setElectionStatus', { status: 'OPEN' }).error.code).toBe('CONFLICT');
  });

  it('cerrar la elección bloquea las estaciones habilitadas', () => {
    const token = openElectionWithDevice(t);
    t.adminOk('setElectionStatus', { status: 'CLOSED' });
    expect(t.kioskOk('status', token).device.status).toBe('LOCKED');
  });

  it('no permite crear una elección nueva con otra abierta', () => {
    t.adminOk('seedTestData');
    t.adminOk('setElectionStatus', { status: 'OPEN' });
    expect(t.admin('createElection', { name: 'Otra' }).error.code).toBe('CONFLICT');
  });

  it('nueva elección copia candidatos y separa los votos por election_id', () => {
    const token = openElectionWithDevice(t);
    const ballot = t.kioskOk('ballot', token);
    t.kioskOk('submit', token, { ballotId: newBallotId(), selections: fullSelections(ballot) });
    t.adminOk('setElectionStatus', { status: 'CLOSED' });
    t.adminOk('createElection', { name: 'Elección real', copyCandidates: true });
    const results = t.adminOk('getResults');
    expect(results.election.name).toBe('Elección real');
    expect(results.ballots).toBe(0);
    expect(t.table('Candidates')).toHaveLength(72);
  });
});

describe('resultados', () => {
  let t;
  let token;
  let ballot;
  beforeEach(() => {
    t = createTestServer();
    token = openElectionWithDevice(t);
    ballot = t.kioskOk('ballot', token);
  });

  const vote = (pick) => {
    t.kioskOk('unlock', token);
    t.kioskOk('submit', token, { ballotId: newBallotId(), selections: fullSelections(ballot, pick) });
  };

  it('ocultos mientras la elección está abierta', () => {
    vote(0);
    const res = t.adminOk('getResults');
    expect(res.visible).toBe(false);
    expect(res.ballots).toBe(1);
    expect(res.categories).toBeUndefined();
  });

  it('visibles al cerrar, con conteo, porcentaje y ganador', () => {
    vote(0);
    vote(0);
    vote(1);
    t.adminOk('setElectionStatus', { status: 'CLOSED' });
    const res = t.adminOk('getResults');
    expect(res.visible).toBe(true);
    expect(res.ballots).toBe(3);
    const pres = res.categories[0].positions[0];
    expect(pres.candidates[0].votes).toBe(2);
    expect(pres.candidates[0].pct).toBe(66.7);
    expect(pres.winnerIds).toEqual([pres.candidates[0].id]);
    expect(pres.tie).toBe(false);
  });

  it('resultados en vivo opcionales', () => {
    vote(0);
    t.adminOk('setShowLiveResults', { value: true });
    expect(t.adminOk('getResults').visible).toBe(true);
  });

  it('detecta empates', () => {
    vote(0);
    vote(1);
    t.adminOk('setElectionStatus', { status: 'CLOSED' });
    expect(t.adminOk('getResults').categories[0].positions[0].tie).toBe(true);
  });

  it('excluye y reporta papeletas incompletas', () => {
    vote(0);
    // Simular un fallo: borrar una fila de la papeleta directamente en la hoja.
    t.holder.state.sheets.Votes.splice(1, 1);
    const res = t.adminOk('getResults');
    expect(res.ballots).toBe(0);
    expect(res.incomplete).toHaveLength(1);
    expect(t.adminOk('dashboard').incomplete).toBe(1);
  });

  it('el dashboard muestra participación y estaciones', () => {
    vote(0);
    const d = t.adminOk('dashboard');
    expect(d.ballots).toBe(1);
    expect(d.devices).toHaveLength(1);
    expect(d.devices[0].last_activity).toBeTruthy();
    expect(d.activity.length).toBeGreaterThan(0);
    expect(d.appUrl).toBe('http://localhost:5173/');
  });

  it('exporta a la hoja Resultados solo si son visibles', () => {
    vote(0);
    expect(t.admin('exportResults').error.code).toBe('RESULTS_HIDDEN');
    t.adminOk('setElectionStatus', { status: 'CLOSED' });
    expect(t.adminOk('exportResults').url).toContain('#gid=');
    expect(t.holder.state.sheets.Resultados.length).toBeGreaterThan(36);
  });
});

