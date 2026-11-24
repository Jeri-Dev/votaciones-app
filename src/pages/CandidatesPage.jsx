import { useCallback, useEffect, useState } from 'react';
import { Database, Eye, EyeOff, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAdmin } from '../context/AdminContext.jsx';
import { PageHeader } from '../components/admin/AdminLayout.jsx';
import { CandidateForm } from '../components/admin/CandidateForm.jsx';
import { directivaStyle } from '../components/voting/directivas.js';
import { Avatar, Badge, Button, Card, ConfirmDialog, Spinner } from '../components/shared/ui.jsx';

export default function CandidatesPage() {
  const { api, run, dashboard } = useAdmin();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const electionStatus = dashboard.election?.status;

  const load = useCallback(() => api.getCandidates().then(setData).catch(() => setData((d) => d || null)), [api]);
  useEffect(() => {
    load();
  }, [load, electionStatus]);

  if (!data) return <Spinner className="size-8" />;
  const { categories, editable } = data;
  const total = categories.reduce((n, c) => n + c.positions.reduce((m, p) => m + p.candidates.length, 0), 0);

  const save = async (values) => {
    const action = values.id ? () => api.updateCandidate(values) : () => api.createCandidate(values);
    const res = await run(action, values.id ? 'Candidato actualizado' : 'Candidato agregado');
    if (res.ok) await load();
    return res.ok;
  };

  const toggle = async (c) => {
    await run(() => api.updateCandidate({ id: c.id, active: !c.active }), c.active ? 'Candidato desactivado' : 'Candidato activado');
    load();
  };

  const confirmDelete = async () => {
    setBusy(true);
    await run(() => api.deleteCandidate(deleting.id), 'Candidato eliminado');
    setBusy(false);
    setDeleting(null);
    load();
  };

  const seed = async () => {
    setBusy(true);
    await run(() => api.seedTestData(), 'Candidatos de ejemplo cargados');
    setBusy(false);
    load();
  };

  return (
    <>
      <PageHeader
        title="Candidatos"
        description={`${total} candidatos en 3 directivas × 4 cargos.`}
        actions={
          editable && (
            <>
              {total === 0 && (
                <Button variant="secondary" icon={Database} loading={busy} onClick={seed}>
                  Cargar ejemplo
                </Button>
              )}
              <Button icon={Plus} onClick={() => setForm({})}>
                Nuevo candidato
              </Button>
            </>
          )
        }
      />

      {!editable && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <Lock className="size-5 shrink-0 text-slate-500" />
          La votación ya fue abierta: los candidatos quedan congelados para no afectar los votos registrados.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        {categories.map((cat) => {
          const s = directivaStyle(cat.id);
          const Icon = s.icon;
          return (
            <Card key={cat.id} className="overflow-hidden">
              <div className={`flex items-center gap-2 px-5 py-3 text-white ${s.band}`}>
                <Icon className="size-5" />
                <h2 className="font-semibold">{cat.name}</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {cat.positions.map((pos) => (
                  <div key={pos.id} className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{pos.name}</h3>
                      {editable && (
                        <button
                          type="button"
                          onClick={() => setForm({ positionId: pos.id })}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-navy-700 hover:bg-navy-50"
                        >
                          <Plus className="size-4" /> Agregar
                        </button>
                      )}
                    </div>
                    {pos.candidates.length === 0 ? (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Sin candidatos</p>
                    ) : (
                      <ul className="space-y-1">
                        {pos.candidates.map((c) => (
                          <li key={c.id} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${c.active ? '' : 'opacity-50'}`}>
                            <Avatar name={c.name} photoUrl={c.photo_url} className="size-8 text-xs" tone={s.avatar} />
                            <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{c.name}</span>
                            {!c.active && <Badge>Inactivo</Badge>}
                            {editable && (
                              <span className="flex shrink-0 gap-0.5">
                                <IconButton label="Editar" icon={Pencil} onClick={() => setForm({ ...c, positionId: pos.id })} />
                                <IconButton label={c.active ? 'Desactivar' : 'Activar'} icon={c.active ? EyeOff : Eye} onClick={() => toggle(c)} />
                                <IconButton label="Eliminar" icon={Trash2} danger onClick={() => setDeleting(c)} />
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {form && (
        <CandidateForm open initial={form} categories={categories} onSave={save} onClose={() => setForm(null)} />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="¿Eliminar candidato?"
        message={deleting && `Se eliminará a ${deleting.name}. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        loading={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

function IconButton({ label, icon: Icon, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`rounded-lg p-1.5 ${danger ? 'text-slate-400 hover:bg-red-50 hover:text-red-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
    >
      <Icon className="size-4" />
    </button>
  );
}
