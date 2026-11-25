// Emulador mínimo de los servicios de Google Apps Script que usa el backend.
// Permite ejecutar el código REAL de apps-script/*.gs en el navegador (npm run dev)
// y en Vitest, sin desplegar nada. Solo implementa los métodos que el backend usa.

import { sha256Bytes } from './sha256.js';

export function createEmptyState() {
  return { sheets: {}, props: { SPREADSHEET_ID: 'emulated-spreadsheet' }, cache: {} };
}

const isEmptyCell = (v) => v === '' || v === null || v === undefined;

function makeRange(holder, name, row, col, numRows, numCols) {
  const data = () => holder.state.sheets[name];
  const range = {
    getValues() {
      const d = data();
      const out = [];
      for (let r = 0; r < numRows; r++) {
        const src = d[row - 1 + r] || [];
        const line = [];
        for (let c = 0; c < numCols; c++) {
          const v = src[col - 1 + c];
          line.push(isEmptyCell(v) ? '' : v);
        }
        out.push(line);
      }
      return out;
    },
    setValues(values) {
      if (values.length !== numRows || values.some((line) => line.length !== numCols)) {
        throw new Error(`setValues: dimensiones incorrectas (se esperaban ${numRows}x${numCols})`);
      }
      const d = data();
      for (let r = 0; r < numRows; r++) {
        const idx = row - 1 + r;
        const target = Array.isArray(d[idx]) ? [...d[idx]] : [];
        for (let c = 0; c < numCols; c++) target[col - 1 + c] = values[r][c];
        for (let c = 0; c < target.length; c++) if (target[c] === undefined) target[c] = '';
        d[idx] = target;
      }
      return range;
    },
    setNumberFormat: () => range,
    setFontWeight: () => range,
    setBackground: () => range,
    setFontColor: () => range,
    clearContent() {
      const d = data();
      for (let r = 0; r < numRows; r++) {
        const idx = row - 1 + r;
        if (!Array.isArray(d[idx])) continue;
        for (let c = 0; c < numCols; c++) d[idx][col - 1 + c] = '';
      }
      return range;
    },
  };
  return range;
}

function makeSheet(holder, name) {
  const data = () => holder.state.sheets[name];
  const emptyRows = (n) => Array.from({ length: n }, () => []);
  const sheet = {
    getName: () => name,
    getSheetId: () => Object.keys(holder.state.sheets).indexOf(name),
    getLastRow() {
      const d = data();
      for (let i = d.length - 1; i >= 0; i--) {
        if (Array.isArray(d[i]) && d[i].some((v) => !isEmptyCell(v))) return i + 1;
      }
      return 0;
    },
    getLastColumn() {
      return data().reduce((max, r) => (Array.isArray(r) ? Math.max(max, r.length) : max), 0);
    },
    getMaxRows: () => Math.max(1000, data().length),
    getRange: (row, col, numRows = 1, numCols = 1) => makeRange(holder, name, row, col, numRows, numCols),
    insertRowsBefore(pos, n) {
      const d = data();
      if (pos - 1 < d.length) d.splice(pos - 1, 0, ...emptyRows(n));
      return sheet;
    },
    insertRowsAfter(pos, n) {
      const d = data();
      if (pos < d.length) d.splice(pos, 0, ...emptyRows(n));
      return sheet;
    },
    deleteRow(r) {
      data().splice(r - 1, 1);
      return sheet;
    },
    clear() {
      holder.state.sheets[name] = [];
      return sheet;
    },
    setFrozenRows: () => sheet,
  };
  return sheet;
}

/**
 * @param holder  objeto { state } — el estado puede reemplazarse entre llamadas.
 * @param options { activeUser, effectiveUser, url, now, onLog, lockAvailable }
 */
export function createGasServices(holder, options = {}) {
  const now = options.now || (() => Date.now());
  const owner = options.effectiveUser || 'owner@example.com';

  const spreadsheet = {
    getId: () => holder.state.props.SPREADSHEET_ID || 'emulated-spreadsheet',
    getUrl: () => 'https://docs.google.com/spreadsheets/d/emulated',
    getSheetByName: (n) => (holder.state.sheets[n] ? makeSheet(holder, n) : null),
    insertSheet(n) {
      if (holder.state.sheets[n]) throw new Error(`La hoja ${n} ya existe`);
      holder.state.sheets[n] = [];
      return makeSheet(holder, n);
    },
  };

  const cache = {
    get(key) {
      const entry = holder.state.cache[key];
      if (!entry) return null;
      if (entry.exp <= now()) {
        delete holder.state.cache[key];
        return null;
      }
      return entry.value;
    },
    put(key, value, seconds = 600) {
      holder.state.cache[key] = { value: String(value), exp: now() + Math.min(seconds, 21600) * 1000 };
    },
    removeAll(keys) {
      keys.forEach((k) => delete holder.state.cache[k]);
    },
    remove(key) {
      delete holder.state.cache[key];
    },
    getAll(keys) {
      const out = {};
      keys.forEach((k) => {
        const v = cache.get(k);
        if (v !== null) out[k] = v;
      });
      return out;
    },
  };

  const properties = {
    getProperty: (k) => (k in holder.state.props ? holder.state.props[k] : null),
    setProperty(k, v) {
      holder.state.props[k] = String(v);
      return properties;
    },
    setProperties(obj) {
      Object.keys(obj).forEach((k) => (holder.state.props[k] = String(obj[k])));
      return properties;
    },
    deleteProperty(k) {
      delete holder.state.props[k];
      return properties;
    },
    getProperties: () => ({ ...holder.state.props }),
  };

  return {
    SpreadsheetApp: {
      openById: () => spreadsheet,
      getActiveSpreadsheet: () => spreadsheet,
      flush() {},
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => options.lockAvailable !== false,
        waitLock() {
          if (options.lockAvailable === false) throw new Error('Lock timeout');
        },
        releaseLock() {},
        hasLock: () => true,
      }),
    },
    CacheService: { getScriptCache: () => cache },
    PropertiesService: { getScriptProperties: () => properties },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      computeDigest: (_alg, text) => sha256Bytes(String(text)).map((b) => (b > 127 ? b - 256 : b)),
      getUuid: () => globalThis.crypto.randomUUID(),
      formatDate(date, timeZone, format) {
        if (format !== 'yyyy-MM-dd') throw new Error('formatDate emulado solo soporta yyyy-MM-dd');
        return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
      },
    },
    Session: {
      getScriptTimeZone: () => 'America/Santo_Domingo',
      getActiveUser: () => ({ getEmail: () => (options.activeUser === undefined ? owner : options.activeUser) }),
      getEffectiveUser: () => ({ getEmail: () => owner }),
    },
    ScriptApp: { getService: () => ({ getUrl: () => options.url || 'http://localhost:5173/' }) },
    Logger: { log: (...args) => (options.onLog ? options.onLog(args.join(' ')) : undefined) },
    HtmlService: {
      createHtmlOutputFromFile() {
        throw new Error('HtmlService no está disponible en el emulador');
      },
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput(content) {
        const output = {
          mimeType: 'text/plain',
          getContent: () => content,
          setMimeType(type) {
            output.mimeType = type;
            return output;
          },
          getMimeType: () => output.mimeType,
        };
        return output;
      },
    },
  };
}

const EXPORTED = ['kioskApi', 'adminApi', 'publicApi', 'doPost', 'setupDatabase', 'mostrarDatosAdmin', 'diagnostico', 'limpiarVotos', 'limpiarTodo', 'readTable_'];

/** Evalúa los archivos .gs (como hace Apps Script: un solo ámbito global compartido). */
export function loadServer(sources, services) {
  const code = Object.keys(sources)
    .sort()
    .map((file) => `// ---- ${file}\n${sources[file]}`)
    .join('\n;\n');
  const names = Object.keys(services);
  // eslint-disable-next-line no-new-func
  const factory = new Function(...names, `${code}\n;return { ${EXPORTED.join(', ')} };`);
  return factory(...names.map((n) => services[n]));
}
