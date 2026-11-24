import { callServer } from './googleScript.js';

/** Cliente del panel. La llave secreta viene del enlace ?view=admin&key=... */
export function createAdminService(adminKey) {
  const call = (action, payload) => callServer('adminApi', action, adminKey, payload || {});
  return {
    dashboard: () => call('dashboard'),
    listElections: () => call('listElections'),
    createElection: (data) => call('createElection', data),
    updateElection: (data) => call('updateElection', data),
    setElectionStatus: (status) => call('setElectionStatus', { status }),
    getCandidates: () => call('getCandidates'),
    createCandidate: (data) => call('createCandidate', data),
    updateCandidate: (data) => call('updateCandidate', data),
    deleteCandidate: (id) => call('deleteCandidate', { id }),
    seedTestData: () => call('seedTestData'),
    getDevices: () => call('getDevices'),
    deviceAction: (action, id) => call(action, { id }),
    getResults: () => call('getResults'),
    exportResults: () => call('exportResults'),
    getAuditLogs: (options) => call('getAuditLogs', options),
    setShowLiveResults: (value) => call('setShowLiveResults', { value }),
  };
}
