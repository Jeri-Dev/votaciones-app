import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { KeyRound } from 'lucide-react';
import { AdminProvider, useAdmin } from '../context/AdminContext.jsx';
import { AdminLayout } from '../components/admin/AdminLayout.jsx';
import { Spinner } from '../components/shared/ui.jsx';
import DashboardPage from './DashboardPage.jsx';
import CandidatesPage from './CandidatesPage.jsx';
import DevicesPage from './DevicesPage.jsx';
import ResultsPage from './ResultsPage.jsx';
import SettingsPage from './SettingsPage.jsx';
import BigResultsPage from './BigResultsPage.jsx';
import { BIG_SCREEN_ROUTE } from '../components/admin/OpenBigScreenButton.jsx';

function AdminGate() {
  const { dashboard, error } = useAdmin();
  if (error?.code === 'AUTH') {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow">
          <KeyRound className="mx-auto mb-4 size-12 text-red-500" />
          <h1 className="text-xl font-bold text-slate-900">Enlace de administración inválido</h1>
          <p className="mt-2 text-slate-600">
            Use el enlace del panel completo (incluye <code className="rounded bg-slate-100 px-1">?view=admin&amp;key=…</code>).
            El dueño del sistema puede verlo ejecutando <code className="rounded bg-slate-100 px-1">mostrarDatosAdmin</code> en Apps Script.
          </p>
        </div>
      </div>
    );
  }
  if (!dashboard) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
        <Spinner className="size-10" />
        {error && <p>Reintentando conexión… ({error.message})</p>}
      </div>
    );
  }
  return (
    <Routes>
      {/* Resultados en grande para proyector: sin sidebar ni menús. */}
      <Route path={BIG_SCREEN_ROUTE} element={<BigResultsPage />} />
      <Route element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="candidatos" element={<CandidatesPage />} />
        <Route path="estaciones" element={<DevicesPage />} />
        <Route path="resultados" element={<ResultsPage />} />
        <Route path="ajustes" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function AdminApp({ adminKey }) {
  return (
    <AdminProvider adminKey={adminKey}>
      <HashRouter>
        <AdminGate />
      </HashRouter>
    </AdminProvider>
  );
}
