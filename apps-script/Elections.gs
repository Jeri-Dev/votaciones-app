/**
 * Elections.gs — ciclo de vida de la elección.
 *
 * Estados: DRAFT (preparación) → OPEN ⇄ PAUSED → CLOSED (final).
 * Siempre hay una sola elección activa (Script Property ACTIVE_ELECTION_ID).
 * "Nueva elección" crea otra y deja la anterior intacta: los votos nunca se borran.
 */

const ELECTION_TRANSITIONS = {
  DRAFT: ['OPEN'],
  OPEN: ['PAUSED', 'CLOSED'],
  PAUSED: ['OPEN', 'CLOSED'],
  CLOSED: [],
};

function publicElection_(e) {
  if (!e) return null;
  return {
    id: e.id,
    name: e.name,
    description: e.description,
    status: e.status,
    created_at: e.created_at,
    opened_at: e.opened_at,
    closed_at: e.closed_at,
  };
}

function getActiveElection_() {
  const id = props_().getProperty('ACTIVE_ELECTION_ID');
  if (!id) return null;
  return findRecord_('Elections', 'id', id);
}

function requireActiveElection_() {
  const e = getActiveElection_();
  if (!e) throw appError_('NO_ELECTION', 'No hay una elección configurada.');
  return e;
}

function getElection_() {
  return publicElection_(getActiveElection_());
}

function listElections_() {
  const activeId = props_().getProperty('ACTIVE_ELECTION_ID');
  return readTable_('Elections').map(function (e) {
    const pub = publicElection_(e);
    pub.active = e.id === activeId;
    return pub;
  }).reverse();
}

function createElectionRecord_(name, description) {
  const record = appendRecord_('Elections', {
    id: shortId_('E'),
    name: name,
    description: description,
    status: 'DRAFT',
    created_at: nowIso_(),
    opened_at: '',
    closed_at: '',
  });
  props_().setProperty('ACTIVE_ELECTION_ID', record.id);
  return record;
}

/** Crea una nueva elección (opcionalmente copiando los candidatos de la actual). */
function createElection_(payload) {
  return withLock_(function () {
    const current = getActiveElection_();
    if (current && (current.status === 'OPEN' || current.status === 'PAUSED')) {
      throw appError_('CONFLICT', 'Cierre la elección actual antes de crear una nueva.');
    }
    const name = cleanText_(payload.name, 100, 'Nombre', true);
    const description = cleanText_(payload.description, 300, 'Descripción', false);
    const created = createElectionRecord_(name, description);

    let copied = 0;
    if (payload.copyCandidates && current) {
      readTable_('Candidates')
        .filter(function (c) { return c.election_id === current.id && isTrue_(c.active); })
        .forEach(function (c) {
          appendRecord_('Candidates', {
            id: shortId_('C'),
            election_id: created.id,
            name: c.name,
            category_id: c.category_id,
            position_id: c.position_id,
            photo_url: c.photo_url,
            active: 'TRUE',
            created_at: nowIso_(),
          });
          copied++;
        });
    }
    // Las estaciones quedan bloqueadas hasta que el staff las habilite.
    lockAllDevices_();
    invalidatePublicCandidates_();
    audit_('staff', 'ELECTION_CREATED', name + (copied ? ' (' + copied + ' candidatos copiados)' : ''));
    return publicElection_(created);
  });
}

function updateElection_(payload) {
  return withLock_(function () {
    const e = requireActiveElection_();
    e.name = cleanText_(payload.name, 100, 'Nombre', true);
    e.description = cleanText_(payload.description, 300, 'Descripción', false);
    updateRecord_('Elections', e);
    audit_('staff', 'ELECTION_UPDATED', e.name);
    return publicElection_(e);
  });
}

function setElectionStatus_(payload) {
  return withLock_(function () {
    const e = requireActiveElection_();
    const next = String(payload.status || '');
    const allowed = ELECTION_TRANSITIONS[e.status] || [];
    if (allowed.indexOf(next) === -1) {
      throw appError_('CONFLICT', 'No se puede pasar de ' + e.status + ' a ' + next + '.');
    }
    if (next === 'OPEN') {
      const missing = positionsWithoutCandidates_(e.id);
      if (missing.length) {
        throw appError_('VALIDATION', 'Faltan candidatos en: ' + missing.join(', ') + '.');
      }
      if (!e.opened_at) e.opened_at = nowIso_();
    }
    if (next === 'CLOSED') {
      e.closed_at = nowIso_();
      lockAllDevices_();
    }
    e.status = next;
    updateRecord_('Elections', e);
    invalidatePublicCandidates_();
    audit_('staff', 'ELECTION_' + next, e.name);
    return publicElection_(e);
  });
}

/**
 * Votaciones sin suficientes candidatos activos (impiden abrir la votación).
 * Cada una necesita al menos tantos candidatos como cargos reparte (2: titular y segundo).
 */
function positionsWithoutCandidates_(electionId) {
  const candidates = readTable_('Candidates').filter(function (c) {
    return c.election_id === electionId && isTrue_(c.active);
  });
  const categories = readTable_('Categories');
  const catName = {};
  categories.forEach(function (c) { catName[c.id] = c.name; });
  return readTable_('Positions')
    .filter(function (p) {
      const count = candidates.filter(function (c) { return c.position_id === p.id; }).length;
      return count < positionRoles_(p).length;
    })
    .map(function (p) {
      return p.name + ' (' + catName[p.category_id] + ', mínimo ' + positionRoles_(p).length + ')';
    });
}
