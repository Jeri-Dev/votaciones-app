import { Link } from 'react-router';
import { Activity, CircleAlert, FileCheck, Tablet, TriangleAlert, UserRoundPen } from 'lucide-react';
import { useAdmin } from '../context/AdminContext.jsx';
import { PageHeader } from '../components/admin/AdminLayout.jsx';
import { ElectionControls } from '../components/admin/ElectionControls.jsx';
import { DeviceTable, isOnline } from '../components/admin/DeviceTable.jsx';
import { ActivityFeed, StatCard } from '../components/dashboard/widgets.jsx';
import { Card } from '../components/shared/ui.jsx';
import { ELECTION_STATUS } from '../utils/format.js';

export default function DashboardPage() {
  const { dashboard } = useAdmin();
  const { election, devices } = dashboard;
  const active = devices.filter((d) => d.status !== 'DISABLED');
  const online = active.filter((d) => isOnline(d, dashboard.serverTime));
  const votingNow = devices.filter((d) => d.status === 'VOTING').length;
  const status = election ? ELECTION_STATUS[election.status] : null;

  return (
    <>
      <PageHeader
        title={election?.name || 'Sin elección'}
        description={election?.description || 'Cada papeleta incluye las directivas de Caballeros, Damas y Jóvenes.'}
        actions={<ElectionControls />}
      />

      {dashboard.incomplete > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <CircleAlert className="size-5 shrink-0" />
          <p>
            <strong>{dashboard.incomplete} papeleta(s) incompleta(s)</strong> en la hoja Votes. No se cuentan en los resultados.
            Revise la hoja de cálculo (Historial de versiones) antes de cerrar.
          </p>
        </div>
      )}
      {election?.status === 'DRAFT' && dashboard.missingPositions.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert className="size-5 shrink-0" />
          <p>
            Para abrir la votación faltan candidatos en: {dashboard.missingPositions.join(', ')}.{' '}
            <Link to="/candidatos" className="font-semibold underline">
              Ir a candidatos
            </Link>
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileCheck} label="Papeletas registradas" value={dashboard.ballots} hint="Cada una con las 3 directivas" tone="green" />
        <StatCard icon={Activity} label="Estado" value={status?.label || '—'} hint={dashboard.resultsVisible ? 'Resultados visibles' : 'Resultados ocultos'} />
        <StatCard icon={Tablet} label="Estaciones en línea" value={`${online.length} / ${active.length}`} hint="Activas y conectadas" tone="blue" />
        <StatCard icon={UserRoundPen} label="Votando ahora" value={votingNow} hint="Personas llenando su papeleta" tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Estaciones</h2>
            <Link to="/estaciones" className="text-sm font-medium text-navy-700 hover:underline">
              Gestionar
            </Link>
          </div>
          <DeviceTable compact />
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Actividad reciente</h2>
          <ActivityFeed items={dashboard.activity} />
        </Card>
      </div>
    </>
  );
}
