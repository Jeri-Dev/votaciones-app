/**
 * Candidates.gs — candidatos por elección, directiva y cargo.
 *
 * Solo se pueden crear, editar o eliminar mientras la elección está en DRAFT.
 * Así ningún cambio puede afectar votos ya registrados.
 */

function readCatalog_() {
  const categories = readTable_('Categories').sort(function (a, b) { return Number(a.sort) - Number(b.sort); });
  const positions = readTable_('Positions').sort(function (a, b) { return Number(a.sort) - Number(b.sort); });
  return { categories: categories, positions: positions };
}

/**
 * Estructura de papeleta: directivas → cargos → candidatos.
 * includeInactive=true para el panel; la estación solo ve candidatos activos.
 */
function buildBallotStructure_(electionId, includeInactive) {
  const catalog = readCatalog_();
  const candidates = readTable_('Candidates').filter(function (c) {
    return c.election_id === electionId && (includeInactive || isTrue_(c.active));
  });
  return catalog.categories.map(function (cat) {
    return {
      id: cat.id,
      name: cat.name,
      positions: catalog.positions
        .filter(function (p) { return p.category_id === cat.id; })
        .map(function (p) {
          return {
            id: p.id,
            name: p.name,
            roles: positionRoles_(p),
            candidates: candidates
              .filter(function (c) { return c.position_id === p.id; })
              .sort(function (a, b) { return a.name.localeCompare(b.name, 'es'); })
              .map(function (c) {
                const out = { id: c.id, name: c.name, photo_url: c.photo_url };
                if (includeInactive) out.active = isTrue_(c.active);
                return out;
              }),
          };
        }),
    };
  });
}

function getCandidates_() {
  const e = requireActiveElection_();
  return {
    election: publicElection_(e),
    editable: e.status === 'DRAFT',
    categories: buildBallotStructure_(e.id, true),
  };
}

function assertEditable_(election) {
  if (election.status !== 'DRAFT') {
    throw appError_('CONFLICT', 'Los candidatos solo se pueden modificar antes de abrir la votación.');
  }
}

function cleanPhotoUrl_(value) {
  const url = cleanText_(value, 500, 'Foto', false);
  if (url && !/^https:\/\//i.test(url)) throw appError_('VALIDATION', 'La foto debe ser un enlace https://');
  return url;
}

function findPosition_(positionId) {
  const pos = findRecord_('Positions', 'id', String(positionId || ''));
  if (!pos) throw appError_('VALIDATION', 'Cargo inválido.');
  return pos;
}

function createCandidate_(payload) {
  return withLock_(function () {
    const e = requireActiveElection_();
    assertEditable_(e);
    const pos = findPosition_(payload.positionId);
    const record = appendRecord_('Candidates', {
      id: shortId_('C'),
      election_id: e.id,
      name: cleanText_(payload.name, 80, 'Nombre', true),
      category_id: pos.category_id,
      position_id: pos.id,
      photo_url: cleanPhotoUrl_(payload.photoUrl),
      active: 'TRUE',
      created_at: nowIso_(),
    });
    audit_('staff', 'CANDIDATE_CREATED', record.name + ' → ' + pos.id);
    return { id: record.id };
  });
}

function findCandidateInElection_(id, election) {
  const c = findRecord_('Candidates', 'id', String(id || ''));
  if (!c || c.election_id !== election.id) throw appError_('NOT_FOUND', 'Candidato no encontrado.');
  return c;
}

function updateCandidate_(payload) {
  return withLock_(function () {
    const e = requireActiveElection_();
    assertEditable_(e);
    const c = findCandidateInElection_(payload.id, e);
    if (payload.name !== undefined) c.name = cleanText_(payload.name, 80, 'Nombre', true);
    if (payload.photoUrl !== undefined) c.photo_url = cleanPhotoUrl_(payload.photoUrl);
    if (payload.positionId !== undefined) {
      const pos = findPosition_(payload.positionId);
      c.position_id = pos.id;
      c.category_id = pos.category_id;
    }
    if (payload.active !== undefined) c.active = payload.active ? 'TRUE' : 'FALSE';
    updateRecord_('Candidates', c);
    audit_('staff', 'CANDIDATE_UPDATED', c.name);
    return { id: c.id };
  });
}

function deleteCandidate_(payload) {
  return withLock_(function () {
    const e = requireActiveElection_();
    assertEditable_(e);
    const c = findCandidateInElection_(payload.id, e);
    const hasVotes = readTable_('Votes').some(function (v) { return v.candidate_id === c.id; });
    if (hasVotes) throw appError_('CONFLICT', 'Este candidato tiene votos registrados y no se puede eliminar.');
    deleteRecord_('Candidates', c);
    audit_('staff', 'CANDIDATE_DELETED', c.name);
    return { id: c.id };
  });
}

/** Candidatos de ejemplo para ensayar. Solo si la elección está en DRAFT y vacía. */
function seedTestData_() {
  return withLock_(function () {
    const e = requireActiveElection_();
    assertEditable_(e);
    const existing = readTable_('Candidates').some(function (c) { return c.election_id === e.id; });
    if (existing) throw appError_('CONFLICT', 'La elección ya tiene candidatos.');
    const names = {
      CAB: ['Juan Pérez', 'Pedro Martínez', 'Luis Rodríguez', 'Carlos Gómez', 'José Ramírez', 'Miguel Torres', 'Andrés Díaz', 'Rafael Castillo', 'Manuel Reyes', 'Francisco Cruz', 'Ramón Santos', 'Jorge Vargas'],
      DAM: ['María López', 'Ana Hernández', 'Rosa Jiménez', 'Carmen Medina', 'Altagracia Peña', 'Juana Mejía', 'Luisa Rosario', 'Mercedes Núñez', 'Teresa Báez', 'Yolanda Polanco', 'Ramona Féliz', 'Esther Cabrera'],
      JOV: ['Daniel Ortiz', 'Sofía Guzmán', 'Samuel Paredes', 'Valeria Soto', 'David Acosta', 'Camila Rivas', 'Josué Marte', 'Andrea Lora', 'Caleb Sánchez', 'Rebeca Tavárez', 'Elías Montero', 'Noemí Cuevas'],
    };
    let count = 0;
    readTable_('Positions').forEach(function (pos) {
      const pool = names[pos.category_id] || [];
      const offset = (Number(pos.sort) - 1) * 4;
      pool.slice(offset, offset + 4).forEach(function (name) {
        appendRecord_('Candidates', {
          id: shortId_('C'),
          election_id: e.id,
          name: name,
          category_id: pos.category_id,
          position_id: pos.id,
          photo_url: '',
          active: 'TRUE',
          created_at: nowIso_(),
        });
        count++;
      });
    });
    audit_('staff', 'TEST_DATA_LOADED', count + ' candidatos de ejemplo');
    return { count: count };
  });
}
