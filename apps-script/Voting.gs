/**
 * Voting.gs — registro de papeletas.
 *
 * Una papeleta = 12 filas en Votes (3 directivas × 4 cargos) con el mismo ballot_id.
 *
 * Garantías:
 *  - Idempotencia: el cliente genera ballot_id antes de enviar; un reintento con el
 *    mismo id devuelve éxito sin duplicar.
 *  - Todo o nada: las 12 filas se escriben con UN solo setValues dentro del lock.
 *    Las papeletas incompletas (si algo fallara) se excluyen de los resultados y se
 *    reportan en el panel (ver Results.gs).
 *  - Anonimato: cada papeleta se inserta en una posición aleatoria entre papeletas
 *    existentes y solo guarda la fecha, así el orden de filas no revela quién votó.
 */

const BALLOT_ID_PATTERN = /^[A-Za-z0-9-]{16,64}$/;

/** La papeleta que ve la estación: solo candidatos activos. */
function getBallotForDevice_(token) {
  const device = validateDevice_(token);
  if (device.status !== 'READY' && device.status !== 'VOTING') {
    throw appError_('DEVICE_NOT_READY', 'La estación no está habilitada.');
  }
  const e = getActiveElection_();
  if (!e || e.status !== 'OPEN') throw appError_('ELECTION_NOT_OPEN', 'La votación no está abierta.');
  return {
    election: { id: e.id, name: e.name, status: e.status },
    categories: buildBallotStructure_(e.id, false),
  };
}

/**
 * Valida las selecciones contra la estructura de la elección.
 * selections = { positionId: candidateId } con exactamente un candidato por cargo.
 * Devuelve [{ category_id, position_id, candidate_id }].
 */
function validateBallot_(structure, selections) {
  if (!selections || typeof selections !== 'object' || Array.isArray(selections)) {
    throw appError_('VALIDATION', 'Papeleta inválida.');
  }
  const expected = {};
  structure.forEach(function (cat) {
    cat.positions.forEach(function (pos) {
      expected[pos.id] = { category_id: cat.id, candidates: pos.candidates.map(function (c) { return c.id; }) };
    });
  });
  const given = Object.keys(selections);
  given.forEach(function (positionId) {
    if (!Object.prototype.hasOwnProperty.call(expected, positionId)) {
      throw appError_('VALIDATION', 'Cargo desconocido en la papeleta.');
    }
  });
  return Object.keys(expected).map(function (positionId) {
    const candidateId = selections[positionId];
    if (!candidateId) throw appError_('VALIDATION', 'La papeleta está incompleta.');
    if (expected[positionId].candidates.indexOf(String(candidateId)) === -1) {
      throw appError_('VALIDATION', 'Candidato inválido para el cargo.');
    }
    return { category_id: expected[positionId].category_id, position_id: positionId, candidate_id: String(candidateId) };
  });
}

function registerVote_(token, payload) {
  return withLock_(function () {
    const ballotId = String((payload && payload.ballotId) || '');
    if (!BALLOT_ID_PATTERN.test(ballotId)) throw appError_('VALIDATION', 'Identificador de papeleta inválido.');

    const device = validateDevice_(token);
    const sh = sheet_('Votes');
    const lastRow = sh.getLastRow();
    const ballotColumn = lastRow >= 2
      ? sh.getRange(2, 2, lastRow - 1, 1).getValues().map(function (r) { return String(r[0]); })
      : [];

    // 1. Reintento de una papeleta ya guardada → éxito sin duplicar.
    if (ballotColumn.indexOf(ballotId) !== -1) {
      return { registered: true, duplicate: true };
    }

    // 2. Estación y elección.
    if (device.status !== 'READY' && device.status !== 'VOTING') {
      throw appError_('DEVICE_NOT_READY', 'La estación no está habilitada. Su voto NO fue registrado.');
    }
    const e = getActiveElection_();
    if (!e || e.status !== 'OPEN') {
      throw appError_('ELECTION_NOT_OPEN', 'La votación no está abierta. Su voto NO fue registrado.');
    }
    if (payload.electionId && payload.electionId !== e.id) {
      throw appError_('VALIDATION', 'La papeleta pertenece a otra elección.');
    }

    // 3. Validación completa del lado del servidor.
    const choices = validateBallot_(buildBallotStructure_(e.id, false), payload.selections);
    const date = todayLocal_();
    const rows = choices.map(function (c) {
      return toRow_('Votes', {
        vote_id: shortId_('V'),
        ballot_id: ballotId,
        election_id: e.id,
        category_id: c.category_id,
        position_id: c.position_id,
        candidate_id: c.candidate_id,
        created_at: date,
      });
    });

    // 4. Posición aleatoria entre papeletas existentes (inicio de cada papeleta o al final).
    const boundaries = [];
    for (let i = 0; i < ballotColumn.length; i++) {
      if (ballotColumn[i] && ballotColumn[i] !== ballotColumn[i - 1]) boundaries.push(i + 2);
    }
    boundaries.push(lastRow + 1);
    const target = boundaries[Math.floor(Math.random() * boundaries.length)];
    if (target <= lastRow) {
      sh.insertRowsBefore(target, rows.length);
    } else {
      ensureRows_(sh, lastRow + rows.length);
    }
    sh.getRange(target, 1, rows.length, rows[0].length).setNumberFormat('@').setValues(rows);

    // 5. La estación queda bloqueada hasta que el staff la habilite.
    setDeviceStatus_(device, 'LOCKED', false);
    audit_('device:' + device.id, 'BALLOT_CAST', '');
    return { registered: true, duplicate: false };
  });
}
