import { useEffect, useState } from 'react';
import { CirclePlus, Eye, Presentation, Save } from 'lucide-react';
import { OpenBigScreenButton } from '../components/admin/OpenBigScreenButton.jsx';
import { useAdmin } from '../context/AdminContext.jsx';
import { PageHeader } from '../components/admin/AdminLayout.jsx';
import { Badge, Button, Card, Modal } from '../components/shared/ui.jsx';
import { ELECTION_STATUS, formatDateTime } from '../utils/format.js';

const input =
  'mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-navy-700 focus:ring-4 focus:ring-navy-100';

function ElectionForm() {
  const { dashboard, api, run } = useAdmin();
  const election = dashboard.election;
  const [name, setName] = useState(election?.name || '');
  const [description, setDescription] = useState(election?.description || '');
  const [saving, setSaving] = useState(false);

  if (!election) return null;
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await run(() => api.updateElection({ name, description }), 'Elección actualizada');
    setSaving(false);
  };

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-semibold text-slate-900">Elección actual</h2>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Nombre
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Descripción (opcional)
          <textarea
            className={`${input} h-20 py-2`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
          />
        </label>
        <Button type="submit" icon={Save} loading={saving} disabled={!name.trim()}>
          Guardar
        </Button>
      </form>
    </Card>
  );
}

function LiveResultsToggle() {
  const { dashboard, api, run } = useAdmin();
  const [busy, setBusy] = useState(false);
  const on = dashboard.showLiveResults;
  const toggle = async () => {
    setBusy(true);
    await run(() => api.setShowLiveResults(!on), on ? 'Resultados en vivo desactivados' : 'Resultados en vivo activados');
    setBusy(false);
  };
  return (
    <Card className="p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
        <Eye className="size-5 text-navy-700" /> Resultados en vivo
      </h2>
      <p className="mb-4 text-sm text-slate-500">
        Por defecto los resultados solo se muestran al cerrar la votación. Actívelo únicamente si el comité lo autoriza. Las
        estaciones de votación nunca ven resultados.
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={busy}
        onClick={toggle}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${on ? 'bg-green-600' : 'bg-slate-300'}`}
      >
        <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      <span className="ml-3 text-sm font-medium text-slate-700">{on ? 'Activado' : 'Desactivado'}</span>
    </Card>
  );
}

function Elections() {
  const { dashboard, api, run } = useAdmin();
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [copy, setCopy] = useState(true);
  const [saving, setSaving] = useState(false);
  const status = dashboard.election?.status;
  const canCreate = !status || status === 'DRAFT' || status === 'CLOSED';

  useEffect(() => {
    api.listElections().then(setList).catch(() => {});
  }, [api, dashboard.election?.id, status]);

  const create = async () => {
    setSaving(true);
    const res = await run(() => api.createElection({ name, copyCandidates: copy }), 'Nueva elección creada');
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      setName('');
    }
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Historial de elecciones</h2>
        <Button size="sm" variant="secondary" icon={CirclePlus} disabled={!canCreate} onClick={() => setOpen(true)}>
          Nueva elección
        </Button>
      </div>
      {!canCreate && <p className="mb-3 text-xs text-slate-500">Cierre la votación actual para poder crear otra.</p>}
      <ul className="divide-y divide-slate-100 text-sm">
        {list.map((e) => {
          const s = ELECTION_STATUS[e.status];
          return (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="font-medium text-slate-800">
                {e.name} {e.active && <span className="text-xs text-navy-700">(actual)</span>}
              </span>
              <span className="flex items-center gap-3 text-xs text-slate-500">
                {formatDateTime(e.created_at)}
                <Badge tone={s?.tone}>{s?.label || e.status}</Badge>
              </span>
            </li>
          );
        })}
      </ul>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nueva elección"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={create} loading={saving} disabled={!name.trim()}>
              Crear
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-slate-600">
          La elección actual queda guardada con todos sus votos (no se borra nada). La nueva empieza en preparación, con el
          conteo en cero y todas las estaciones bloqueadas. Úselo, por ejemplo, después del ensayo general.
        </p>
        <label className="block text-sm font-medium text-slate-700">
          Nombre
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
        </label>
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={copy} onChange={(e) => setCopy(e.target.checked)} className="size-4 accent-navy-800" />
          Copiar los candidatos de la elección actual
        </label>
      </Modal>
    </Card>
  );
}

export default function SettingsPage() {
  const { dashboard } = useAdmin();
  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="grid gap-6 lg:grid-cols-2">
        <ElectionForm key={dashboard.election?.id} />
        <div className="space-y-6">
          <LiveResultsToggle />
          <Card className="p-5">
            <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
              <Presentation className="size-5 text-navy-700" /> Pantalla de resultados
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              Vista a pantalla completa, sin menús, para un proyector o televisor. Se actualiza sola. Mientras los resultados
              estén ocultos muestra solo la participación.
            </p>
            <OpenBigScreenButton variant="secondary" />
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Elections />
        </div>
      </div>
    </>
  );
}
