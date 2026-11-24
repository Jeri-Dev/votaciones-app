export function timeAgo(iso, now = Date.now()) {
  if (!iso) return '—';
  const diff = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (diff < 10) return 'ahora';
  if (diff < 60) return `hace ${diff} s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString('es');
}

export function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
}

export const ELECTION_STATUS = {
  DRAFT: { label: 'En preparación', tone: 'slate' },
  OPEN: { label: 'Votación abierta', tone: 'green' },
  PAUSED: { label: 'En pausa', tone: 'amber' },
  CLOSED: { label: 'Cerrada', tone: 'navy' },
};

export const DEVICE_STATUS = {
  READY: { label: 'Habilitada', tone: 'green' },
  VOTING: { label: 'Votando', tone: 'blue' },
  LOCKED: { label: 'Bloqueada', tone: 'slate' },
  DISABLED: { label: 'Deshabilitada', tone: 'red' },
};

const ACTIONS = {
  SETUP: 'Sistema verificado',
  ELECTION_CREATED: 'Elección creada',
  ELECTION_UPDATED: 'Elección editada',
  ELECTION_OPEN: 'Votación abierta',
  ELECTION_PAUSED: 'Votación en pausa',
  ELECTION_CLOSED: 'Votación cerrada',
  CANDIDATE_CREATED: 'Candidato agregado',
  CANDIDATE_UPDATED: 'Candidato editado',
  CANDIDATE_DELETED: 'Candidato eliminado',
  TEST_DATA_LOADED: 'Datos de ejemplo cargados',
  DEVICE_REGISTERED: 'Estación registrada',
  DEVICE_UNLOCKED: 'Estación habilitada en la tablet',
  DEVICE_ACTIVATED: 'Estación habilitada',
  DEVICE_LOCKED: 'Estación bloqueada',
  DEVICE_DISABLED: 'Estación deshabilitada',
  DEVICE_RESET: 'Estación reiniciada',
  BALLOT_CAST: 'Papeleta registrada',
  ACCESS_DENIED: 'Acceso denegado al panel',
  RESULTS_EXPORTED: 'Resultados exportados',
  LIVE_RESULTS_ON: 'Resultados en vivo activados',
  LIVE_RESULTS_OFF: 'Resultados en vivo desactivados',
};

export const actionLabel = (action) => ACTIONS[action] || action;
