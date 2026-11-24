import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { CircleAlert, Download, EyeOff, FileSpreadsheet, FileCheck, Trophy } from 'lucide-react';
import { useAdmin } from '../context/AdminContext.jsx';
import { usePolling } from '../hooks/usePolling.js';
import { PageHeader } from '../components/admin/AdminLayout.jsx';
import { ResultBars, StatCard } from '../components/dashboard/widgets.jsx';
import { directivaStyle } from '../components/voting/directivas.js';
import { Button, Card, Spinner } from '../components/shared/ui.jsx';
import { downloadCsv, resultsToRows, toCsv } from '../utils/csv.js';
import { seatSummary } from '../utils/seats.js';
import { openExternal } from '../services/googleScript.js';
import { OpenBigScreenButton } from '../components/admin/OpenBigScreenButton.jsx';

const RESULTS_POLL_MS = 4000;

function winnersSummary(cat) {
  return cat.positions.flatMap((pos) =>
    seatSummary(pos).map((s) => ({ id: `${pos.id}-${s.role}`, position: s.role, names: s.names, tie: s.tie })),
  );
}

export default function ResultsPage() {
  const { api, run } = useAdmin();
  const [results, setResults] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => api.getResults().then(setResults), [api]);
  usePolling(load, RESULTS_POLL_MS, true);

  if (!results) return <Spinner className="size-8" />;

  const exportCsv = () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`resultados-${date}.csv`, toCsv(resultsToRows(results)));
  };

  const exportSheet = async () => {
    setExporting(true);
    const res = await run(() => api.exportResults(), 'Resultados copiados a la hoja “Resultados”');
    setExporting(false);
    if (res.ok) openExternal(res.data.url);
  };

  return (
    <>
      <PageHeader
        title="Resultados"
        description={results.visible ? 'Se actualizan automáticamente cada pocos segundos.' : undefined}
        actions={
          <>
            <OpenBigScreenButton variant="secondary" />
            {results.visible && (
              <>
                <Button variant="secondary" icon={FileSpreadsheet} loading={exporting} onClick={exportSheet}>
                  Abrir en Google Sheets
                </Button>
                <Button icon={Download} onClick={exportCsv}>
                  Descargar CSV
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={FileCheck} label="Papeletas válidas" value={results.ballots} tone="green" />
        {results.incomplete.length > 0 && (
          <StatCard icon={CircleAlert} label="Papeletas incompletas (no cuentan)" value={results.incomplete.length} tone="amber" />
        )}
      </div>

      {!results.visible ? (
        <Card className="flex flex-col items-center p-10 text-center">
          <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-navy-100 text-navy-800">
            <EyeOff className="size-8" />
          </span>
          <h2 className="text-lg font-semibold text-slate-900">Resultados ocultos</h2>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Los resultados se mostrarán cuando se cierre la votación. Si necesita verlos en vivo, actívelo en{' '}
            <Link to="/ajustes" className="font-medium text-navy-700 underline">
              Ajustes
            </Link>
            .
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {results.categories.map((cat) => {
            const s = directivaStyle(cat.id);
            const Icon = s.icon;
            return (
              <Card key={cat.id} className="overflow-hidden">
                <div className={`flex items-center gap-2 px-5 py-3 text-white ${s.band}`}>
                  <Icon className="size-5" />
                  <h2 className="font-semibold">Directiva de {cat.name}</h2>
                </div>
                <div className={`grid gap-3 border-b border-slate-100 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4 ${s.soft}`}>
                  {winnersSummary(cat).map((w) => (
                    <div key={w.id}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{w.position}</p>
                      <p className={`mt-0.5 flex items-center gap-1.5 font-semibold ${s.text}`}>
                        <Trophy className="size-4 shrink-0" />
                        {w.names.length ? w.names.join(' y ') : '—'}
                        {w.tie && <span className="text-xs text-amber-700">(empate)</span>}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-8 p-5 md:grid-cols-2">
                  {cat.positions.map((pos) => (
                    <ResultBars key={pos.id} position={pos} barClass={s.band} />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
