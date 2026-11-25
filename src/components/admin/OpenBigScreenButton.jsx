import { useNavigate } from 'react-router';
import { Hash, Presentation } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext.jsx';
import { isGasHosted, openExternal } from '../../services/googleScript.js';
import { Button } from '../shared/ui.jsx';

export const BIG_SCREEN_ROUTE = '/pantalla';

/**
 * Abre la pantalla de resultados en grande (#/pantalla) en otra pestaña, lista para
 * el proyector. Si no se conoce la URL pública de la app, navega en la misma pestaña.
 */
export function OpenBigScreenButton({ variant = 'primary', size = 'md' }) {
  const { dashboard, adminKey } = useAdmin();
  const navigate = useNavigate();
  // Dentro de Apps Script la URL pública es la /exec; fuera (Netlify, dev) es la página actual.
  const baseUrl = isGasHosted() ? dashboard?.appUrl : `${window.location.origin}${window.location.pathname}`;
  const open = () => {
    if (baseUrl) {
      openExternal(`${baseUrl}?view=admin&key=${encodeURIComponent(adminKey)}#${BIG_SCREEN_ROUTE}`);
    } else {
      navigate(BIG_SCREEN_ROUTE);
    }
  };
  return (
    <Button variant={variant} size={size} icon={Presentation} onClick={open}>
      Pantalla de resultados
    </Button>
  );
}

/** Abre la pantalla de conteo público (…/?view=conteo), que no necesita llave. */
export function OpenCounterButton({ variant = 'secondary', size = 'md' }) {
  const { dashboard } = useAdmin();
  const baseUrl = isGasHosted() ? dashboard?.appUrl : `${window.location.origin}${window.location.pathname}`;
  return (
    <Button variant={variant} size={size} icon={Hash} disabled={!baseUrl} onClick={() => openExternal(`${baseUrl}?view=conteo`)}>
      Conteo público
    </Button>
  );
}
