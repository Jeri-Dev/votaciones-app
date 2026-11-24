/**
 * Security.gs — hashing, tokens de estación y llave del panel.
 *
 * - Los tokens de dispositivo nunca se guardan en claro: solo su SHA-256.
 * - El panel se protege con la llave secreta del enlace (?view=admin&key=...).
 */

function sha256Hex_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8);
  // computeDigest devuelve bytes con signo (-128..127).
  return Array.prototype.map.call(bytes, function (b) {
    return ((b + 256) % 256).toString(16).padStart(2, '0');
  }).join('');
}

function randomToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

/** Comparación de longitud constante para no filtrar información por tiempos. */
function safeEqual_(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verifica la llave secreta del panel del staff (?view=admin&key=...). */
function authenticateAdmin_(key) {
  const expected = props_().getProperty('ADMIN_KEY');
  if (!expected || !key || !safeEqual_(key, expected)) {
    // Registrar el intento sin inundar el AuditLog (máx. 1 por minuto).
    const cache = cache_();
    if (!cache.get('denied_logged')) {
      cache.put('denied_logged', '1', 60);
      audit_('unknown', 'ACCESS_DENIED', 'Llave de panel inválida');
    }
    throw appError_('AUTH', 'Enlace de administración inválido.');
  }
}

/** Busca el dispositivo por el hash de su token. El id nunca sirve como credencial. */
function validateDevice_(token) {
  if (!token || typeof token !== 'string' || token.length < 32) {
    throw appError_('UNREGISTERED', 'Esta estación no está registrada.');
  }
  const device = findRecord_('Devices', 'token_hash', sha256Hex_(token));
  if (!device) throw appError_('UNREGISTERED', 'Esta estación no está registrada.');
  return device;
}
