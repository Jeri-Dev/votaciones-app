// Backend de desarrollo: ejecuta el código REAL de apps-script/*.gs en el navegador
// sobre una hoja de cálculo emulada guardada en localStorage (compartida entre pestañas,
// así una pestaña puede ser el panel y otras las estaciones).
//
// Parámetros útiles en la URL de desarrollo:
//   ?mockFail=0.3   → 30% de las llamadas fallan (la mitad DESPUÉS de ejecutarse en el
//                     servidor, para probar reintentos sin duplicar votos)
//   ?station=2      → simula otra tablet en la misma computadora
// En la consola: __mockReset() reinicia la base de datos emulada.

import { createEmptyState, createGasServices, loadServer } from '../emulator/gasEmulator.js';

const sources = import.meta.glob('../../apps-script/*.gs', { query: '?raw', import: 'default', eager: true });
const STORAGE_KEY = 'vi_mock_db';
export const DEV_ADMIN_KEY = 'dev';

const holder = { state: null };

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holder.state));
  } catch (err) {
    console.warn('No se pudo guardar el estado emulado', err);
  }
}

const server = loadServer(
  sources,
  createGasServices(holder, { url: `${location.origin}/`, onLog: (l) => console.info('[Logger]', l) }),
);

function bootstrap() {
  holder.state = createEmptyState();
  holder.state.props.ADMIN_KEY = DEV_ADMIN_KEY;
  server.setupDatabase();
  server.adminApi('seedTestData', DEV_ADMIN_KEY, {});
  save();
  console.info(
    `%c[mock] Base de datos emulada creada.%c\n  Panel: ${location.origin}/?view=admin&key=${DEV_ADMIN_KEY}\n  Resultados en grande: ${location.origin}/?view=admin&key=${DEV_ADMIN_KEY}#/pantalla\n  Desbloqueo: 3 toques en la esquina superior izquierda`,
    'font-weight:bold;color:#1d4477',
    '',
  );
}

holder.state = load();
if (!holder.state) bootstrap();

window.__mockReset = () => {
  localStorage.removeItem(STORAGE_KEY);
  bootstrap();
  location.reload();
};

const failRate = Number(new URLSearchParams(location.search).get('mockFail') || 0);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export async function mockCall(fn, args) {
  if (!['kioskApi', 'adminApi', 'publicApi'].includes(fn)) throw new Error(`Función no expuesta: ${fn}`);
  await delay(250 + Math.random() * 450);
  const fail = Math.random() < failRate;
  if (fail && Math.random() < 0.5) throw new Error('Fallo de red simulado (antes del servidor)');
  holder.state = load() || holder.state;
  const result = server[fn](...JSON.parse(JSON.stringify(args)));
  save();
  if (fail) throw new Error('Fallo de red simulado (respuesta perdida)');
  return JSON.parse(JSON.stringify(result));
}
