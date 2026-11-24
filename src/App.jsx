import { useEffect, useState } from 'react';
import { Tablet } from 'lucide-react';
import { getLocation } from './services/googleScript.js';
import { deviceToken } from './services/deviceService.js';
import { Spinner } from './components/shared/ui.jsx';
import VotingPage from './pages/VotingPage.jsx';
import AdminApp from './pages/AdminApp.jsx';

/** Se pidió el panel desde un navegador registrado como estación de votación. */
function StationBlocksAdmin() {
  return (
    <div className="flex h-full items-center justify-center bg-slate-100 p-6">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow">
        <Tablet className="mx-auto mb-4 size-12 text-navy-700" />
        <h1 className="text-xl font-bold text-slate-900">Este navegador es una estación de votación</h1>
        <p className="mt-2 text-slate-600">
          Por seguridad, un navegador registrado como estación no puede abrir el panel del staff. Abra este enlace en una{' '}
          <strong>ventana de incógnito</strong>, en otro navegador o en otro dispositivo.
        </p>
      </div>
    </div>
  );
}

/**
 * Una sola app, dos vistas:
 *   …/exec                       → estación de votación (kiosko)
 *   …/exec?view=admin&key=XXXX   → panel del staff
 * Una tablet ya registrada como estación nunca abre el panel.
 */
export default function App() {
  const [view, setView] = useState(null);

  useEffect(() => {
    getLocation().then((loc) => {
      const p = loc.parameter || {};
      // En desarrollo todas las pestañas comparten localStorage, por eso no se aplica la regla.
      const isStation = !import.meta.env.DEV && Boolean(deviceToken.get());
      const requestsAdmin = p.view === 'admin' && Boolean(p.key);
      if (requestsAdmin && isStation) {
        setView({ name: 'station-blocks-admin' });
        return;
      }
      // En Apps Script la app vive en un iframe que no recibe el #ruta de la URL;
      // se copia aquí para que …/exec?view=admin&key=…#/pantalla abra esa vista.
      if (requestsAdmin && loc.hash && window.location.hash !== `#${loc.hash}`) {
        window.location.hash = loc.hash;
      }
      setView(requestsAdmin ? { name: 'admin', key: p.key } : { name: 'kiosk' });
    });
  }, []);

  if (!view) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }
  if (view.name === 'station-blocks-admin') return <StationBlocksAdmin />;
  return view.name === 'admin' ? <AdminApp adminKey={view.key} /> : <VotingPage />;
}
