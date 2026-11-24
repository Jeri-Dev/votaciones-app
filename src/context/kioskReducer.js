// Máquina de estados de la estación de votación.
//
// Regla clave: el SERVIDOR decide si la estación está bloqueada. El cliente solo
// refleja ese estado; recargar la página nunca permite saltarse el bloqueo.
//
// Fases:
//   loading → offline | unregistered | locked | disabled | closed | welcome
//   welcome → ballot ⇄ review → submitting → locked (¡gracias!) | failed

export const POLL_FAST_PHASES = ['loading', 'offline', 'locked', 'disabled', 'closed', 'failed', 'welcome'];
export const VOTER_PHASES = ['welcome', 'ballot', 'review'];

export function initialKioskState(hasPending) {
  return {
    phase: hasPending ? 'submitting' : 'loading',
    device: null,
    election: null,
    session: null,
    ballot: null,
    selections: {},
    justVoted: false,
    submitAttempt: 0,
    failure: null,
  };
}

const clearedBallot = { ballot: null, selections: {}, session: null, failure: null, submitAttempt: 0 };

/** Aplica el estado que reporta el servidor (polling, desbloqueo, registro). */
function reconcile(state, device, election) {
  const next = { ...state, device, election: election === undefined ? state.election : election };
  // Mientras se envía o se muestra un fallo, no se interrumpe al votante.
  if (state.phase === 'submitting' || state.phase === 'failed') return next;

  if (device.status === 'DISABLED') return { ...next, ...clearedBallot, phase: 'disabled', justVoted: false };
  if (device.status === 'LOCKED') return { ...next, ...clearedBallot, phase: 'locked' };

  // READY o VOTING: la estación está habilitada para una papeleta.
  if (device.session !== state.session) {
    // Sesión nueva (desbloqueo o reinicio remoto): todo desde cero.
    return {
      ...next,
      ...clearedBallot,
      session: device.session,
      justVoted: false,
      phase: next.election?.status === 'OPEN' ? 'welcome' : 'closed',
    };
  }
  if (next.election?.status !== 'OPEN') return { ...next, phase: 'closed' };
  if (!VOTER_PHASES.includes(state.phase)) {
    // Volver de "en pausa": se conserva la papeleta a medio llenar.
    return { ...next, phase: Object.keys(state.selections).length ? 'ballot' : 'welcome' };
  }
  return next;
}

export function kioskReducer(state, action) {
  switch (action.type) {
    case 'SERVER_STATUS':
      return reconcile(state, action.device, action.election);
    case 'OFFLINE':
      return state.phase === 'loading' ? { ...state, phase: 'offline' } : state;
    case 'UNREGISTERED':
      return { ...initialKioskState(false), phase: 'unregistered' };
    case 'SET_BALLOT':
      return { ...state, ballot: action.ballot };
    case 'START':
      return state.phase === 'welcome' && state.ballot ? { ...state, phase: 'ballot' } : state;
    case 'SELECT':
      if (state.phase !== 'ballot') return state;
      return { ...state, selections: { ...state.selections, [action.positionId]: action.candidateId } };
    case 'REVIEW':
      return state.phase === 'ballot' ? { ...state, phase: 'review' } : state;
    case 'BACK_TO_BALLOT':
      return state.phase === 'review' || state.phase === 'failed' ? { ...state, phase: 'ballot', failure: null } : state;
    case 'SUBMIT_START':
      return state.phase === 'review' ? { ...state, phase: 'submitting', submitAttempt: 0, failure: null } : state;
    case 'SUBMIT_RETRY':
      return { ...state, submitAttempt: action.attempt };
    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        ...clearedBallot,
        phase: 'locked',
        justVoted: true,
        device: state.device ? { ...state.device, status: 'LOCKED' } : state.device,
      };
    case 'SUBMIT_FAILED':
      return { ...state, phase: 'failed', failure: action.error, submitAttempt: 0 };
    case 'DISMISS_FAILURE':
      // Se vuelve a consultar al servidor para decidir la siguiente pantalla.
      return { ...state, ...clearedBallot, phase: 'loading', session: null };
    case 'IDLE_RESET':
      return VOTER_PHASES.includes(state.phase) ? { ...state, phase: 'welcome', selections: {} } : state;
    default:
      return state;
  }
}
