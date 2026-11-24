import { useState } from 'react';
import { Avatar, Button, Modal } from '../shared/ui.jsx';

/** Formulario para crear o editar un candidato. */
export function CandidateForm({ open, initial, categories, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || '');
  const [positionId, setPositionId] = useState(initial?.positionId || categories[0]?.positions[0]?.id || '');
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url || '');
  const [saving, setSaving] = useState(false);
  const editing = Boolean(initial?.id);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onSave({ id: initial?.id, name: name.trim(), positionId, photoUrl: photoUrl.trim() });
    setSaving(false);
    if (ok) onClose();
  };

  const input =
    'mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-navy-700 focus:ring-4 focus:ring-navy-100';

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar candidato' : 'Nuevo candidato'}>
      <form id="candidate-form" onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar name={name || '?'} photoUrl={photoUrl.startsWith('https://') ? photoUrl : ''} className="size-14 text-lg" />
          <label className="flex-1 text-sm font-medium text-slate-700">
            Nombre completo
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required autoFocus />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Directiva y cargo
          <select className={input} value={positionId} onChange={(e) => setPositionId(e.target.value)}>
            {categories.map((cat) => (
              <optgroup key={cat.id} label={cat.name}>
                {cat.positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {cat.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Foto (opcional)
          <input className={input} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" inputMode="url" />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Enlace público https a una imagen. Si se deja vacío se muestran las iniciales.
          </span>
        </label>
      </form>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" form="candidate-form" loading={saving} disabled={!name.trim()}>
          {editing ? 'Guardar cambios' : 'Agregar candidato'}
        </Button>
      </div>
    </Modal>
  );
}
