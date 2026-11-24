import { useEffect, useState } from 'react';
import { getLocation } from './services/googleScript.js';
import { deviceToken } from './services/deviceService.js';
import { Spinner } from './components/shared/ui.jsx';
import VotingPage from './pages/VotingPage.jsx';
import AdminApp from './pages/AdminApp.jsx';

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
      const wantsAdmin = p.view === 'admin' && p.key && !isStation;
      // En Apps Script la app vive en un iframe que no recibe el #ruta de la URL;
      // se copia aquí para que …/exec?view=admin&key=…#/pantalla abra esa vista.
      if (wantsAdmin && loc.hash && window.location.hash !== `#${loc.hash}`) {
        window.location.hash = loc.hash;
      }
      setView(wantsAdmin ? { name: 'admin', key: p.key } : { name: 'kiosk' });
    });
  }, []);

  if (!view) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }
  return view.name === 'admin' ? <AdminApp adminKey={view.key} /> : <VotingPage />;
}
