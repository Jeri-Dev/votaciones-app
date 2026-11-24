/**
 * Database.gs — esquema de Google Sheets y helpers de lectura/escritura.
 *
 * Todas las celdas se guardan como TEXTO (formato "@") para que Sheets no convierta
 * fechas, IDs o booleanos por su cuenta.
 */

const SCHEMA = {
  Elections: ['id', 'name', 'description', 'status', 'created_at', 'opened_at', 'closed_at'],
  Categories: ['id', 'name', 'sort'],
  Positions: ['id', 'name', 'category_id', 'sort'],
  Candidates: ['id', 'election_id', 'name', 'category_id', 'position_id', 'photo_url', 'active', 'created_at'],
  // Votes NO guarda dispositivo, hora exacta ni nada del votante.
  Votes: ['vote_id', 'ballot_id', 'election_id', 'category_id', 'position_id', 'candidate_id', 'created_at'],
  Devices: ['id', 'name', 'status', 'token_hash', 'session_id', 'created_at', 'updated_at'],
  AuditLog: ['id', 'at', 'actor', 'action', 'detail'],
};

const SEED_CATEGORIES = [
  ['CAB', 'Caballeros', '1'],
  ['DAM', 'Damas', '2'],
  ['JOV', 'Jóvenes', '3'],
];

const SEED_POSITIONS = [
  ['PRES', 'Presidente'],
  ['VICE', 'Vicepresidente'],
  ['SECR', 'Secretario'],
  ['TESO', 'Tesorero'],
];

let SPREADSHEET_CACHE_ = null;

/**
 * Crea (o completa) todas las hojas. Es idempotente y NO destructiva:
 * nunca borra ni modifica datos existentes. Ejecútela desde el editor.
 */
function setupDatabase() {
  assertOwner_();
  const p = props_();
  if (!p.getProperty('SPREADSHEET_ID')) {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (!active) {
      throw new Error('No hay hoja activa. Abra el script desde la hoja (Extensiones > Apps Script) o defina SPREADSHEET_ID en las propiedades del script.');
    }
    p.setProperty('SPREADSHEET_ID', active.getId());
  }
  SPREADSHEET_CACHE_ = null;
  const ss = db_();

  Object.keys(SCHEMA).forEach(function (name) {
    ensureSheet_(ss, name, SCHEMA[name]);
  });

  if (readTable_('Categories').length === 0) {
    SEED_CATEGORIES.forEach(function (c) {
      appendRecord_('Categories', { id: c[0], name: c[1], sort: c[2] });
    });
  }
  if (readTable_('Positions').length === 0) {
    SEED_CATEGORIES.forEach(function (c) {
      SEED_POSITIONS.forEach(function (pos, i) {
        appendRecord_('Positions', { id: c[0] + '-' + pos[0], name: pos[1], category_id: c[0], sort: String(i + 1) });
      });
    });
  }

  if (!p.getProperty('ADMIN_KEY')) {
    p.setProperty('ADMIN_KEY', randomToken_().slice(0, 24));
  }

  if (!getActiveElection_()) {
    createElectionRecord_('Elección de directivas ' + new Date().getFullYear(), '');
  }

  audit_('system', 'SETUP', 'Base de datos verificada');
  mostrarDatosAdmin();
  return 'OK';
}

/** Muestra en el registro de ejecución el enlace secreto del panel. Solo para el dueño. */
function mostrarDatosAdmin() {
  assertOwner_();
  const key = props_().getProperty('ADMIN_KEY');
  const url = appUrl_();
  Logger.log('Enlace del panel del staff: ' + (url || '<URL de la app web>') + '?view=admin&key=' + key);
  Logger.log('Pantalla de resultados en grande: ' + (url || '<URL de la app web>') + '?view=admin&key=' + key + '#/pantalla');
  Logger.log('Enlace de las estaciones de votación: ' + (url || '<URL de la app web>'));
}

/** Revisión de solo lectura: confirma hojas, propiedades y conteos. */
function diagnostico() {
  assertOwner_();
  const p = props_();
  ['SPREADSHEET_ID', 'ADMIN_KEY', 'ACTIVE_ELECTION_ID'].forEach(function (k) {
    Logger.log(k + ': ' + (p.getProperty(k) ? 'OK' : 'FALTA'));
  });
  Object.keys(SCHEMA).forEach(function (name) {
    const sh = db_().getSheetByName(name);
    Logger.log('Hoja ' + name + ': ' + (sh ? (Math.max(sh.getLastRow() - 1, 0) + ' filas') : 'FALTA'));
  });
  const election = getActiveElection_();
  Logger.log('Elección activa: ' + (election ? election.name + ' [' + election.status + ']' : 'ninguna'));
}

function db_() {
  if (SPREADSHEET_CACHE_) return SPREADSHEET_CACHE_;
  const id = props_().getProperty('SPREADSHEET_ID');
  if (!id) throw appError_('NOT_SETUP', 'El sistema no está configurado. Ejecute setupDatabase() desde el editor.');
  SPREADSHEET_CACHE_ = SpreadsheetApp.openById(id);
  return SPREADSHEET_CACHE_;
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const firstRow = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  if (firstRow.every(function (v) { return v === ''; })) {
    sh.getRange(1, 1, 1, headers.length).setNumberFormat('@').setValues([headers]);
  }
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0f2a4a').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.getRange(1, 1, sh.getMaxRows(), headers.length).setNumberFormat('@');
  return sh;
}

function sheet_(name) {
  const sh = db_().getSheetByName(name);
  if (!sh) throw appError_('NOT_SETUP', 'Falta la hoja "' + name + '". Ejecute setupDatabase() desde el editor.');
  return sh;
}

function normalizeCell_(value) {
  if (value instanceof Date) return value.toISOString();
  if (value === null || value === undefined) return '';
  return String(value);
}

function rowToRecord_(name, row, rowNumber) {
  const record = { _row: rowNumber };
  SCHEMA[name].forEach(function (h, j) {
    record[h] = normalizeCell_(row[j]);
  });
  return record;
}

function isBlankRow_(row) {
  return row.every(function (v) { return v === '' || v === null || v === undefined; });
}

/** Lee toda la hoja como objetos. Cada objeto trae _row (número de fila real). */
function readTable_(name) {
  const sh = sheet_(name);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, SCHEMA[name].length).getValues();
  const out = [];
  values.forEach(function (row, i) {
    if (!isBlankRow_(row)) out.push(rowToRecord_(name, row, i + 2));
  });
  return out;
}

/** Lee solo las últimas n filas (para el registro de actividad). */
function readTail_(name, n) {
  const sh = sheet_(name);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const start = Math.max(2, lastRow - n + 1);
  const values = sh.getRange(start, 1, lastRow - start + 1, SCHEMA[name].length).getValues();
  const out = [];
  values.forEach(function (row, i) {
    if (!isBlankRow_(row)) out.push(rowToRecord_(name, row, start + i));
  });
  return out;
}

function findRecord_(name, field, value) {
  const rows = readTable_(name);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][field] === value) return rows[i];
  }
  return null;
}

function toRow_(name, record) {
  return SCHEMA[name].map(function (h) {
    const v = record[h];
    return v === undefined || v === null ? '' : String(v);
  });
}

/** Garantiza que la hoja tenga al menos `rowNumber` filas físicas. */
function ensureRows_(sh, rowNumber) {
  const maxRows = sh.getMaxRows();
  if (rowNumber > maxRows) sh.insertRowsAfter(maxRows, rowNumber - maxRows);
}

function writeRows_(sh, startRow, rows) {
  if (!rows.length) return;
  ensureRows_(sh, startRow + rows.length - 1);
  sh.getRange(startRow, 1, rows.length, rows[0].length).setNumberFormat('@').setValues(rows);
}

function appendRecord_(name, record) {
  const sh = sheet_(name);
  writeRows_(sh, sh.getLastRow() + 1, [toRow_(name, record)]);
  return record;
}

function updateRecord_(name, record) {
  if (!record._row) throw new Error('updateRecord_ requiere _row');
  writeRows_(sheet_(name), record._row, [toRow_(name, record)]);
  return record;
}

function deleteRecord_(name, record) {
  sheet_(name).deleteRow(record._row);
}
