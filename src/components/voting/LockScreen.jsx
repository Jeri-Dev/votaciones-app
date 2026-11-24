import { useCallback, useState } from 'react';
import { CircleCheck, Lock } from 'lucide-react';
import { useKiosk } from '../../context/KioskContext.jsx';
import { useUnlockSequence } from '../../hooks/useUnlockSequence.js';
import { Spinner } from '../shared/ui.jsx';

/**
 * Pantalla de agradecimiento / estación bloqueada.
 * Toda la pantalla es una capa invisible: 3 toques seguidos en la esquina superior
 * izquierda habilitan la estación para la siguiente persona.
 */
export function LockScreen() {
  const { state, unlock } = useKiosk();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onUnlock = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await unlock();
    } catch (err) {
      setError(err?.message || 'No se pudo habilitar la estación.');
    } finally {
      setBusy(false);
    }
  }, [busy, unlock]);
  const onPointerDown = useUnlockSequence(onUnlock);

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center bg-navy-900 px-6 text-center text-white">
      {state.justVoted ? (
        <div className="flex animate-fade-in flex-col items-center">
          <div className="mb-8 flex size-28 animate-pop items-center justify-center rounded-full bg-green-500 sm:mb-10 sm:size-40">
            <CircleCheck className="size-16 text-white sm:size-24" strokeWidth={2.2} />
          </div>
          <h1 className="text-4xl font-bold sm:text-6xl">¡Su voto fue registrado!</h1>
          <p className="mt-5 text-2xl text-navy-100 sm:mt-6 sm:text-3xl">Gracias por participar. Que Dios le bendiga.</p>
          <p className="mt-10 text-lg text-navy-100/70 sm:mt-14 sm:text-xl">Puede retirarse. El staff preparará la estación para la siguiente persona.</p>
        </div>
      ) : (
        <div className="flex animate-fade-in flex-col items-center">
          <div className="mb-8 flex size-24 items-center justify-center rounded-full bg-white/10 sm:mb-10 sm:size-32">
            <Lock className="size-12 text-navy-100 sm:size-16" />
          </div>
          <h1 className="text-4xl font-bold sm:text-5xl">Estación en espera</h1>
          <p className="mt-5 text-xl text-navy-100 sm:mt-6 sm:text-2xl">Por favor, espere a que el staff habilite esta estación.</p>
        </div>
      )}

      <div className="absolute bottom-6 flex flex-col items-center gap-2 text-base text-navy-100/50">
        {busy && <Spinner className="size-6 text-white/70" />}
        {error && <p className="text-amber-300">{error}</p>}
        {state.device?.name && <p>Estación: {state.device.name}</p>}
      </div>

      {/* Capa invisible del gesto de desbloqueo. Sin ninguna señal visual. */}
      <div className="absolute inset-0" onPointerDown={onPointerDown} aria-hidden="true" />
    </div>
  );
}
