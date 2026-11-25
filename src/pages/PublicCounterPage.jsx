import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { callServer } from '../services/googleScript.js';
import { usePolling } from '../hooks/usePolling.js';
import { useWakeLock } from '../pwa.js';
import { Spinner } from '../components/shared/ui.jsx';
import { clockOffset, electionElapsedMs, formatDuration } from '../utils/elapsed.js';

const POLL_MS = 5000;

const STATUS_NOTE = {
  DRAFT: 'La votación aún no ha comenzado',
  PAUSED: 'Votación en pausa',
  CLOSED: 'Votación cerrada',
};

/**
 * Pantalla de conteo público (…/?view=conteo): solo el total de votos en grande y,
 * en una esquina, el tiempo que lleva la votación. No requiere llave y nunca muestra resultados.
 */
export default function PublicCounterPage() {
  const [data, setData] = useState(null);
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [bump, setBump] = useState(0);
  const offset = useRef(0);
  const lastCount = useRef(null);
  useWakeLock(true);

  const load = useCallback(
    () =>
      callServer('publicApi', 'counter').then(
        (d) => {
          offset.current = clockOffset(d.serverTime);
          if (lastCount.current !== null && d.ballots !== lastCount.current) setBump((n) => n + 1);
          lastCount.current = d.ballots;
          setData(d);
          setOffline(false);
        },
        () => setOffline(true),
      ),
    [],
  );
  usePolling(load, POLL_MS, true);

  // Reloj: avanza cada segundo con la hora corregida del servidor.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center bg-navy-950 text-white/70">
        {offline ? <p className="text-xl">Sin conexión. Reintentando…</p> : <Spinner className="size-12 text-white" />}
      </div>
    );
  }

  const { election, ballots } = data;
  const elapsed = electionElapsedMs(election, now + offset.current);
  const note = election ? STATUS_NOTE[election.status] : 'No hay una elección configurada';

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-navy-950 px-6 text-center text-white">
      {/* Esquina: tiempo de votación */}
      <div className="absolute right-4 top-4 text-right sm:right-8 sm:top-6">
        <p className="flex items-center justify-end gap-2 text-sm font-medium uppercase tracking-widest text-white/50 sm:text-base">
          <Clock className="size-4 sm:size-5" /> Tiempo de votación
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums sm:text-5xl lg:text-[clamp(3rem,5vw,5rem)]">{formatDuration(elapsed)}</p>
        {note && <p className="mt-1 text-sm font-semibold text-amber-300 sm:text-base">{note}</p>}
        {offline && <p className="mt-1 text-sm text-amber-300">Reconectando…</p>}
      </div>

      {/* Centro: total de votos */}
      <p
        key={bump}
        className={`font-bold leading-none tabular-nums text-[clamp(7rem,32vw,26rem)] ${bump ? 'animate-pop' : ''}`}
        aria-live="polite"
      >
        {ballots}
      </p>
      <p className="mt-4 text-2xl font-semibold text-white/80 sm:text-4xl lg:text-[clamp(2rem,3.5vw,3.5rem)]">
        {ballots === 1 ? 'voto registrado' : 'votos registrados'}
      </p>

      {election?.name && (
        <p className="absolute bottom-4 left-0 right-0 truncate px-6 text-base text-white/40 sm:bottom-6 sm:text-xl">{election.name}</p>
      )}
    </div>
  );
}
