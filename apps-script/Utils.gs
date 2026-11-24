/**
 * Utils.gs — constantes y utilidades compartidas.
 *
 * Convención: toda función que termina en "_" es PRIVADA (no se puede llamar
 * desde el navegador con google.script.run). Solo kioskApi, adminApi y las
 * funciones de editor protegidas con assertOwner_() son públicas.
 */

const APP = {
  MAX_DEVICES: 10,
  LOCK_WAIT_MS: 20000,
  HEARTBEAT_TTL_SECONDS: 21600,
  POSITIONS_PER_CATEGORY: 4,
};

/** Error de aplicación con código legible por el frontend. */
function appError_(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

function nowIso_() {
  return new Date().toISOString();
}

/** Solo la fecha local (yyyy-MM-dd). Se usa en Votes para no guardar la hora exacta. */
function todayLocal_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function shortId_(prefix) {
  return prefix + Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase();
}

function props_() {
  return PropertiesService.getScriptProperties();
}

function cache_() {
  return CacheService.getScriptCache();
}

function isTrue_(value) {
  return value === true || String(value).toUpperCase() === 'TRUE';
}

/** Texto limpio y con longitud máxima; lanza VALIDATION si es obligatorio y está vacío. */
function cleanText_(value, maxLength, fieldLabel, required) {
  const text = String(value === undefined || value === null ? '' : value).trim().slice(0, maxLength);
  if (required && !text) throw appError_('VALIDATION', 'El campo "' + fieldLabel + '" es obligatorio.');
  return text;
}

/**
 * Ejecuta fn con el lock global del script. Todas las escrituras críticas pasan por aquí,
 * así 10 tablets votando a la vez se serializan sin pisarse.
 */
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(APP.LOCK_WAIT_MS)) {
    throw appError_('BUSY', 'El servidor está ocupado. Reintentando…');
  }
  try {
    const result = fn();
    SpreadsheetApp.flush();
    return result;
  } finally {
    lock.releaseLock();
  }
}

/** Envoltorio uniforme de respuesta: { ok, data } o { ok:false, error:{ code, message } }. */
function respond_(fn) {
  try {
    return { ok: true, data: fn() };
  } catch (err) {
    if (err && err.code) {
      return { ok: false, error: { code: err.code, message: err.message } };
    }
    console.error(err && err.stack ? err.stack : err);
    return { ok: false, error: { code: 'INTERNAL', message: 'Error interno del servidor.' } };
  }
}

/**
 * Protege las funciones pensadas para ejecutarse desde el editor de Apps Script.
 * Con "Ejecutar como: Yo", un visitante anónimo de la web tiene getActiveUser() vacío,
 * así que solo el dueño del script pasa esta verificación.
 */
function assertOwner_() {
  const active = Session.getActiveUser().getEmail();
  const effective = Session.getEffectiveUser().getEmail();
  if (!active || active !== effective) {
    throw appError_('AUTH', 'Esta función solo puede ejecutarse desde el editor de Apps Script.');
  }
}
