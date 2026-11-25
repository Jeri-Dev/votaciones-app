/**
 * Code.gs — punto de entrada de la app web.
 *
 * Funciones públicas (llamables con google.script.run, o por HTTP con doPost):
 *   kioskApi(action, deviceToken, payload)  → estaciones de votación
 *   adminApi(action, adminKey, payload)     → panel del staff (requiere ADMIN_KEY)
 *   publicApi(action)                       → pantalla de conteo público (solo el total, sin resultados)
 *   doPost(e)                               → las anteriores por HTTP (frontend en Netlify)
 * Funciones de editor (protegidas con assertOwner_): setupDatabase, mostrarDatosAdmin, diagnostico.
 * Todo lo demás termina en "_" y es privado.
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Votación de Directivas')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .addMetaTag('mobile-web-app-capable', 'yes')
    .addMetaTag('apple-mobile-web-app-capable', 'yes');
}

const KIOSK_ACTIONS = {
  status: function (token) { return deviceStatus_(token); },
  register: function (token, p) { return registerDevice_(p); },
  ballot: function (token) { return getBallotForDevice_(token); },
  start: function (token) { return startBallot_(token); },
  submit: function (token, p) { return registerVote_(token, p); },
  unlock: function (token) { return unlockDevice_(token); },
};

const ADMIN_ACTIONS = {
  dashboard: function () { return getDashboard_(); },
  listElections: function () { return listElections_(); },
  createElection: function (p) { return createElection_(p); },
  updateElection: function (p) { return updateElection_(p); },
  setElectionStatus: function (p) { return setElectionStatus_(p); },
  getCandidates: function () { return getCandidates_(); },
  createCandidate: function (p) { return createCandidate_(p); },
  updateCandidate: function (p) { return updateCandidate_(p); },
  deleteCandidate: function (p) { return deleteCandidate_(p); },
  seedTestData: function () { return seedTestData_(); },
  getDevices: function () { return getDevices_(); },
  activateDevice: function (p) { return activateDevice_(p); },
  lockDevice: function (p) { return lockDevice_(p); },
  disableDevice: function (p) { return disableDevice_(p); },
  resetDevice: function (p) { return resetDevice_(p); },
  getResults: function () { return getResults_(); },
  exportResults: function () { return exportResultsToSheet_(); },
  getAuditLogs: function (p) { return getAuditLogs_(p); },
  setShowLiveResults: function (p) { return setShowLiveResults_(p); },
};

// Sin autenticación: solo información que se puede mostrar en público (nunca resultados).
const PUBLIC_ACTIONS = {
  counter: function () { return getPublicCounter_(); },
};

function lookupAction_(table, action) {
  if (typeof action !== 'string' || !Object.prototype.hasOwnProperty.call(table, action)) {
    throw appError_('BAD_ACTION', 'Acción no permitida.');
  }
  return table[action];
}

function kioskApi(action, token, payload) {
  return respond_(function () {
    return lookupAction_(KIOSK_ACTIONS, action)(token, payload || {});
  });
}

function adminApi(action, adminKey, payload) {
  return respond_(function () {
    authenticateAdmin_(adminKey);
    return lookupAction_(ADMIN_ACTIONS, action)(payload || {});
  });
}

function publicApi(action) {
  return respond_(function () {
    return lookupAction_(PUBLIC_ACTIONS, action)();
  });
}

/**
 * API HTTP para cuando el frontend está alojado fuera de Apps Script (p. ej. Netlify).
 * Body (Content-Type: text/plain, para evitar el preflight CORS): {"fn":"kioskApi"|"adminApi"|"publicApi","args":[...]}
 * Solo expone las mismas funciones públicas; todo lo demás sigue siendo privado.
 */
const HTTP_API_ = {
  kioskApi: function (args) { return kioskApi(args[0], args[1], args[2]); },
  adminApi: function (args) { return adminApi(args[0], args[1], args[2]); },
  publicApi: function (args) { return publicApi(args[0]); },
};

function doPost(e) {
  let result;
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const handler = typeof body.fn === 'string' && Object.prototype.hasOwnProperty.call(HTTP_API_, body.fn)
      ? HTTP_API_[body.fn]
      : null;
    result = handler && Array.isArray(body.args)
      ? handler(body.args)
      : { ok: false, error: { code: 'BAD_ACTION', message: 'Acción no permitida.' } };
  } catch (err) {
    result = { ok: false, error: { code: 'BAD_REQUEST', message: 'Solicitud inválida.' } };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
