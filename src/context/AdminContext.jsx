import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createAdminService } from '../services/adminService.js';
import { usePolling } from '../hooks/usePolling.js';

const AdminContext = createContext(null);
const DASHBOARD_POLL_MS = 4000;

export function AdminProvider({ adminKey, children }) {
  const api = useMemo(() => createAdminService(adminKey), [adminKey]);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.dashboard();
      setDashboard(data);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [api]);

  usePolling(refresh, DASHBOARD_POLL_MS, error?.code !== 'AUTH');

  const notify = useCallback((message, tone = 'success') => {
    const id = Date.now();
    setToast({ id, message, tone });
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 3500);
  }, []);

  /**
   * Ejecuta una acción, muestra el resultado y refresca el dashboard.
   * Devuelve { ok, data } (nunca lanza) para que los formularios decidan si cerrarse.
   */
  const run = useCallback(
    async (fn, successMessage) => {
      try {
        const data = await fn();
        if (successMessage) notify(successMessage);
        refresh();
        return { ok: true, data };
      } catch (err) {
        notify(err.message || 'Ocurrió un error', 'error');
        return { ok: false, error: err };
      }
    },
    [notify, refresh],
  );

  const value = useMemo(
    () => ({ api, adminKey, dashboard, error, refresh, notify, run, toast }),
    [api, adminKey, dashboard, error, refresh, notify, run, toast],
  );
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin debe usarse dentro de AdminProvider');
  return ctx;
}
