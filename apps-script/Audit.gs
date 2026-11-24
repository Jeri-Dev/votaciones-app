/**
 * Audit.gs — registro de acciones administrativas y de estaciones.
 * Nunca registra selecciones de voto ni el ballot_id.
 */

function audit_(actor, action, detail) {
  try {
    appendRecord_('AuditLog', {
      id: shortId_('L'),
      at: nowIso_(),
      actor: actor,
      action: action,
      detail: detail || '',
    });
  } catch (err) {
    // El registro nunca debe impedir la operación principal.
    console.error('audit_ falló: ' + err);
  }
}

function getAuditLogs_(options) {
  options = options || {};
  const limit = Math.min(Number(options.limit) || 50, 500);
  let rows = options.deviceId
    ? readTable_('AuditLog').filter(function (r) { return r.actor === 'device:' + options.deviceId; })
    : readTail_('AuditLog', limit);
  rows = rows.slice(-limit).reverse();
  return rows.map(function (r) {
    return { id: r.id, at: r.at, actor: r.actor, action: r.action, detail: r.detail };
  });
}
