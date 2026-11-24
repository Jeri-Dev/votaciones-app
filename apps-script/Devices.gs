/**
 * Devices.gs — estaciones de votación (tablets).
 *
 * Estados:
 *   READY    habilitada para UNA papeleta (el staff la desbloqueó)
 *   VOTING   un votante está llenando la papeleta
 *   LOCKED   bloqueada (después de votar o por el staff)
 *   DISABLED fuera de servicio
 *
 * Cada vez que la estación se habilita se genera un session_id nuevo; la tablet lo usa
 * para saber que debe limpiar todo y empezar de cero. Nada aquí toca la hoja Votes.
 */

function publicDevice_(d) {
  return { id: d.id, name: d.name, status: d.status, session: d.session_id };
}

function heartbeat_(deviceId) {
  try {
    cache_().put('hb_' + deviceId, nowIso_(), APP.HEARTBEAT_TTL_SECONDS);
  } catch (err) {
    console.error('heartbeat_ falló: ' + err);
  }
}

function setDeviceStatus_(device, status, newSession) {
  device.status = status;
  if (newSession) device.session_id = Utilities.getUuid();
  device.updated_at = nowIso_();
  updateRecord_('Devices', device);
  return device;
}

/** Registro de una tablet nueva. Devuelve el token UNA sola vez. */
function registerDevice_(payload) {
  return withLock_(function () {
    const name = cleanText_(payload.name, 40, 'Nombre de la estación', true);
    const devices = readTable_('Devices');
    const active = devices.filter(function (d) { return d.status !== 'DISABLED'; });
    if (active.length >= APP.MAX_DEVICES) {
      throw appError_('CONFLICT', 'Ya hay ' + APP.MAX_DEVICES + ' estaciones activas. Deshabilite una desde el panel.');
    }
    const token = randomToken_();
    const device = appendRecord_('Devices', {
      id: 'EST-' + Utilities.getUuid().slice(0, 4).toUpperCase(),
      name: name,
      status: 'LOCKED',
      token_hash: sha256Hex_(token),
      session_id: '',
      created_at: nowIso_(),
      updated_at: nowIso_(),
    });
    audit_('device:' + device.id, 'DEVICE_REGISTERED', name);
    heartbeat_(device.id);
    return { token: token, device: publicDevice_(device) };
  });
}

/** Lo que consulta la tablet periódicamente. Nunca incluye resultados. */
function deviceStatus_(token) {
  const device = validateDevice_(token);
  heartbeat_(device.id);
  const e = getActiveElection_();
  return {
    device: publicDevice_(device),
    election: e ? { id: e.id, name: e.name, status: e.status } : null,
  };
}

/** Desbloqueo desde la tablet (3 toques en la esquina superior izquierda). */
function unlockDevice_(token) {
  return withLock_(function () {
    const device = validateDevice_(token);
    if (device.status === 'DISABLED') throw appError_('DEVICE_DISABLED', 'Estación deshabilitada desde el panel.');
    setDeviceStatus_(device, 'READY', true);
    audit_('device:' + device.id, 'DEVICE_UNLOCKED', 'Desbloqueo en la estación');
    return { device: publicDevice_(device) };
  });
}

/** El votante tocó "Comenzar a votar". */
function startBallot_(token) {
  return withLock_(function () {
    const device = validateDevice_(token);
    if (device.status === 'VOTING') return { device: publicDevice_(device) };
    if (device.status !== 'READY') throw appError_('DEVICE_NOT_READY', 'La estación no está habilitada.');
    setDeviceStatus_(device, 'VOTING', false);
    return { device: publicDevice_(device) };
  });
}

function getDevices_() {
  const devices = readTable_('Devices');
  const beats = cache_().getAll(devices.map(function (d) { return 'hb_' + d.id; })) || {};
  return devices.map(function (d) {
    return {
      id: d.id,
      name: d.name,
      status: d.status,
      created_at: d.created_at,
      updated_at: d.updated_at,
      last_activity: beats['hb_' + d.id] || d.updated_at,
    };
  });
}

function findDevice_(id) {
  const d = findRecord_('Devices', 'id', String(id || ''));
  if (!d) throw appError_('NOT_FOUND', 'Estación no encontrada.');
  return d;
}

function adminDeviceAction_(id, status, newSession, action) {
  return withLock_(function () {
    const device = findDevice_(id);
    setDeviceStatus_(device, status, newSession);
    audit_('staff', action, device.name + ' (' + device.id + ')');
    return { device: publicDevice_(device) };
  });
}

/** Habilitar para el siguiente votante. */
function activateDevice_(payload) {
  return adminDeviceAction_(payload.id, 'READY', true, 'DEVICE_ACTIVATED');
}

function lockDevice_(payload) {
  return adminDeviceAction_(payload.id, 'LOCKED', false, 'DEVICE_LOCKED');
}

function disableDevice_(payload) {
  return adminDeviceAction_(payload.id, 'DISABLED', false, 'DEVICE_DISABLED');
}

/** Reinicio remoto: la tablet descarta cualquier papeleta a medias y vuelve a la bienvenida. */
function resetDevice_(payload) {
  return adminDeviceAction_(payload.id, 'READY', true, 'DEVICE_RESET');
}

/** Usado al cerrar o crear una elección. Debe llamarse ya dentro de withLock_. */
function lockAllDevices_() {
  readTable_('Devices').forEach(function (d) {
    if (d.status === 'READY' || d.status === 'VOTING') setDeviceStatus_(d, 'LOCKED', false);
  });
}
