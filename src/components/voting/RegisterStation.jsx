import { useState } from 'react';
import { Tablet } from 'lucide-react';
import { useKiosk } from '../../context/KioskContext.jsx';
import { Button } from '../shared/ui.jsx';

/** Primer uso de una tablet: el staff le pone un nombre para identificarla en el panel. */
export function RegisterStation() {
  const { register } = useKiosk();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await register(name.trim());
    } catch (err) {
      setError(err?.message || 'No se pudo registrar la estación.');
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-navy-50 p-6">
      <form className="w-full max-w-lg animate-fade-in rounded-3xl bg-white p-8 shadow-xl" onSubmit={submit}>
        <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-navy-100 text-navy-800">
          <Tablet className="size-9" />
        </div>
        <h1 className="text-3xl font-bold text-navy-950">Registrar estación</h1>
        <p className="mt-2 text-lg text-slate-600">
          Escriba un nombre para identificar esta tablet en el panel (por ejemplo, “Mesa 1”).
        </p>
        <label className="mt-6 block text-base font-semibold text-slate-700" htmlFor="station-name">
          Nombre de la estación
        </label>
        <input
          id="station-name"
          className="mt-2 h-14 w-full rounded-xl border border-slate-300 px-4 text-xl outline-none focus:border-navy-700 focus:ring-4 focus:ring-navy-100"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mesa 1"
          autoComplete="off"
        />
        {error && (
          <p className="mt-3 text-base font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="mt-6 w-full" loading={busy} disabled={!name.trim()}>
          Registrar
        </Button>
      </form>
    </div>
  );
}
