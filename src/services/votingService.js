import { kiosk } from './deviceService.js';
import { storage } from '../utils/storage.js';

const station = new URLSearchParams(window.location.search).get('station');
const PENDING_KEY = station ? `vi_pending_ballot_${station}` : 'vi_pending_ballot';

/**
 * Papeleta pendiente de confirmación. Se guarda ANTES de enviar para que, si se cae
 * la red o se recarga la página, se reintente con el mismo ballotId (sin duplicar).
 */
export const pendingBallot = {
  get: () => storage.get(PENDING_KEY),
  set: (ballot) => storage.set(PENDING_KEY, ballot),
  clear: () => storage.remove(PENDING_KEY),
};

export function newBallotId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const votingService = {
  getBallot: () => kiosk('ballot'),
  start: () => kiosk('start'),
  submit: (ballot) =>
    kiosk('submit', { ballotId: ballot.ballotId, electionId: ballot.electionId, selections: ballot.selections }),
};
