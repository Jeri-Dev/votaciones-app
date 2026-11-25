/**
 * Results.gs — conteo, integridad, dashboard y exportación.
 *
 * Los resultados solo se entregan al panel (adminApi) y solo cuando la elección está
 * CLOSED, salvo que el staff active SHOW_LIVE_RESULTS. kioskApi no tiene acceso.
 */

/** Agrupa las filas de Votes por papeleta y separa las válidas de las incompletas. */
function tallyBallots_(electionId) {
  const catalog = readCatalog_();
  const validPositions = {};
  catalog.positions.forEach(function (p) { validPositions[p.id] = p.category_id; });
  const candidateOk = {};
  readTable_('Candidates').forEach(function (c) {
    if (c.election_id === electionId) candidateOk[c.id] = c.position_id;
  });

  const byBallot = {};
  readTable_('Votes').forEach(function (v) {
    if (v.election_id !== electionId) return;
    (byBallot[v.ballot_id] = byBallot[v.ballot_id] || []).push(v);
  });

  const expectedCount = catalog.positions.length;
  const valid = [];
  const incomplete = [];
  Object.keys(byBallot).forEach(function (ballotId) {
    const rows = byBallot[ballotId];
    const seen = {};
    const ok = rows.length === expectedCount && rows.every(function (r) {
      if (seen[r.position_id] || !validPositions[r.position_id]) return false;
      seen[r.position_id] = true;
      return candidateOk[r.candidate_id] === r.position_id;
    });
    (ok ? valid : incomplete).push({ ballotId: ballotId, rows: rows });
  });
  return { valid: valid, incomplete: incomplete };
}

function resultsVisible_(election) {
  return !!election && (election.status === 'CLOSED' || props_().getProperty('SHOW_LIVE_RESULTS') === 'true');
}

function getResults_() {
  const e = requireActiveElection_();
  const tally = tallyBallots_(e.id);
  const base = {
    election: publicElection_(e),
    ballots: tally.valid.length,
    incomplete: tally.incomplete.map(function (b) { return { ballotId: b.ballotId, rows: b.rows.length }; }),
    visible: resultsVisible_(e),
  };
  if (!base.visible) return base;

  const counts = {};
  tally.valid.forEach(function (b) {
    b.rows.forEach(function (r) { counts[r.candidate_id] = (counts[r.candidate_id] || 0) + 1; });
  });
  const total = tally.valid.length;
  base.categories = buildBallotStructure_(e.id, true).map(function (cat) {
    return {
      id: cat.id,
      name: cat.name,
      positions: cat.positions.map(function (pos) {
        const list = pos.candidates.map(function (c) {
          const votes = counts[c.id] || 0;
          return { id: c.id, name: c.name, votes: votes, pct: total ? Math.round((votes / total) * 1000) / 10 : 0 };
        }).sort(function (a, b) { return b.votes - a.votes || a.name.localeCompare(b.name, 'es'); });
        const seats = assignSeats_(pos.roles, list);
        const winnerIds = [];
        seats.forEach(function (s) {
          s.candidateIds.forEach(function (id) { if (winnerIds.indexOf(id) === -1) winnerIds.push(id); });
        });
        return {
          id: pos.id,
          name: pos.name,
          roles: pos.roles,
          total: total,
          candidates: list,
          seats: seats,
          winnerIds: winnerIds,
          tie: seats.some(function (s) { return s.tie; }),
        };
      }),
    };
  });
  return base;
}

/**
 * Reparte los cargos de una votación por orden de votos: el 1.º obtiene roles[0]
 * (Presidente / Secretario) y el 2.º roles[1] (Vicepresidente / Tesorero).
 * Si hay varios candidatos con los mismos votos en esa posición, el cargo queda en EMPATE
 * y se listan todos. Sin votos no se asigna nada.
 * list debe venir ordenada por votos descendente.
 */
function assignSeats_(roles, list) {
  return roles.map(function (role, i) {
    const at = list[i];
    if (!at || at.votes === 0) return { role: role, candidateIds: [], tie: false };
    const same = list.filter(function (c) { return c.votes === at.votes; });
    return { role: role, candidateIds: same.map(function (c) { return c.id; }), tie: same.length > 1 };
  });
}

/** Etiqueta del cargo que obtiene un candidato ("Presidente", "EMPATE: Vicepresidente", ""). */
function seatLabel_(seats, candidateId) {
  const held = seats.filter(function (s) { return s.candidateIds.indexOf(candidateId) !== -1; });
  if (!held.length) return '';
  const roles = held.map(function (s) { return s.role; }).join(' / ');
  return held.some(function (s) { return s.tie; }) ? 'EMPATE: ' + roles : roles;
}

/** Todo lo que el dashboard necesita en una sola llamada (se consulta cada ~4 s). */
function getDashboard_() {
  const e = getActiveElection_();
  const devices = getDevices_();
  let ballots = 0;
  let incomplete = 0;
  let missing = [];
  if (e) {
    const tally = tallyBallots_(e.id);
    ballots = tally.valid.length;
    incomplete = tally.incomplete.length;
    if (e.status === 'DRAFT') missing = positionsWithoutCandidates_(e.id);
  }
  return {
    election: publicElection_(e),
    ballots: ballots,
    incomplete: incomplete,
    missingPositions: missing,
    devices: devices,
    activity: getAuditLogs_({ limit: 15 }),
    resultsVisible: resultsVisible_(e),
    showLiveResults: props_().getProperty('SHOW_LIVE_RESULTS') === 'true',
    serverTime: nowIso_(),
    appUrl: appUrl_(),
  };
}

/** URL pública de la app web (para abrir la pantalla de resultados en otra pestaña). */
function appUrl_() {
  try {
    return ScriptApp.getService().getUrl() || '';
  } catch (err) {
    return '';
  }
}

/**
 * Conteo para la pantalla pública: total de papeletas y tiempos de la elección. Nunca resultados.
 * Se guarda 5 s en CacheService: aunque muchas pantallas lo consulten, la hoja Votes se lee
 * como máximo una vez cada 5 s y no se frena la votación.
 */
const PUBLIC_COUNTER_CACHE_SECONDS = 5;

function getPublicCounter_() {
  const cache = cache_();
  const cached = cache.get('public_counter');
  let data = cached ? JSON.parse(cached) : null;
  if (!data) {
    const e = getActiveElection_();
    data = {
      election: e ? { name: e.name, status: e.status, opened_at: e.opened_at, closed_at: e.closed_at } : null,
      ballots: e ? tallyBallots_(e.id).valid.length : 0,
    };
    cache.put('public_counter', JSON.stringify(data), PUBLIC_COUNTER_CACHE_SECONDS);
  }
  data.serverTime = nowIso_();
  return data;
}

/**
 * Alternativa a la descarga CSV en el navegador: escribe los resultados en la hoja
 * "Resultados" del mismo documento y devuelve su enlace.
 */
function exportResultsToSheet_() {
  const results = getResults_();
  if (!results.visible) throw appError_('RESULTS_HIDDEN', 'Los resultados están ocultos hasta cerrar la votación.');
  return withLock_(function () {
    const ss = db_();
    const name = 'Resultados';
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.clear();
    const rows = [['Elección', 'Directiva', 'Votación', 'Candidato', 'Votos', 'Porcentaje', 'Cargo obtenido']];
    results.categories.forEach(function (cat) {
      cat.positions.forEach(function (pos) {
        pos.candidates.forEach(function (c) {
          rows.push([results.election.name, cat.name, pos.name, c.name, String(c.votes), c.pct + '%', seatLabel_(pos.seats, c.id)]);
        });
      });
    });
    rows.push(['Papeletas válidas', String(results.ballots), '', '', '', '', '']);
    sh.getRange(1, 1, rows.length, rows[0].length).setNumberFormat('@').setValues(rows);
    sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
    audit_('staff', 'RESULTS_EXPORTED', 'Hoja Resultados');
    return { url: ss.getUrl() + '#gid=' + sh.getSheetId() };
  });
}
