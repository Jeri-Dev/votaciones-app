import { useState } from 'react';
import { Download, Share, SquarePlus } from 'lucide-react';
import { useInstallPrompt } from '../../pwa.js';
import { Button } from '../shared/ui.jsx';

/**
 * Sugerencia para instalar la app en la tablet (pantalla completa, sin barra del navegador).
 * Se muestra en el registro de la estación: en iPad la app instalada NO comparte datos con
 * Safari, así que conviene instalar ANTES de registrar.
 */
export function InstallHint() {
  const { mode, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || mode === 'installed' || mode === 'unavailable') return null;

  return (
    <div className="mb-5 rounded-2xl border border-navy-100 bg-navy-50 p-4 text-left">
      <p className="flex items-center gap-2 text-base font-semibold text-navy-950">
        <Download className="size-5 text-navy-700" /> Instale la app antes de registrar
      </p>
      {mode === 'prompt' ? (
        <>
          <p className="mt-1 text-sm text-slate-600">Se abrirá a pantalla completa, sin la barra del navegador.</p>
          <div className="mt-3 flex gap-2">
            <Button size="md" icon={Download} onClick={install}>
              Instalar app
            </Button>
            <Button size="md" variant="ghost" onClick={() => setDismissed(true)}>
              Ahora no
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-600">
            En Safari toque <Share className="inline size-4 align-text-bottom" /> <strong>Compartir</strong> →{' '}
            <SquarePlus className="inline size-4 align-text-bottom" /> <strong>Agregar a inicio</strong>. Luego abra la app desde la
            pantalla de inicio y registre la estación ahí.
          </p>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setDismissed(true)}>
            Entendido
          </Button>
        </>
      )}
    </div>
  );
}
