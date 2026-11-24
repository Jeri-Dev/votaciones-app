import { useCallback, useState } from 'react';
import { EyeOff, Trophy } from 'lucide-react';
import { useAdmin } from '../context/AdminContext.jsx';
import { usePolling } from '../hooks/usePolling.js';
import { directivaStyle } from '../components/voting/directivas.js';
import { Spinner } from '../components/shared/ui.jsx';
import { ELECTION_STATUS, formatTime } from '../utils/format.js';
import { seatLabel, seatSummary } from '../utils/seats.js';

const POLL_MS = 4000;

function PositionResult({ position, accent }) {
  const seats = seatSummary(position);
  return (
    <div className="flex flex-1 flex-col rounded-2xl bg-white/[0.06] px-4 py-3 lg:px-[1.4vw] lg:py-[1vh]">
      <div className="flex shrink-0 items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/60 lg:text-[clamp(0.7rem,1.3vh,1.1rem)]">{position.name}</p>
        {position.tie && <span className="text-xs font-bold text-amber-300 lg:text-[clamp(0.7rem,1.3vh,1.1rem)]">EMPATE</span>}
      </div>
      {/* Cargos obtenidos: 1.º (Presidente/Secretario) y 2.º (Vicepresidente/Tesorero). */}
      <div className="mt-1 grid shrink-0 gap-x-4 gap-y-1 sm:grid-cols-2">
        {seats.map((s, i) => (
          <div key={s.role} className={`min-w-0 ${s.merged ? 'sm:col-span-2' : ''}`}>
            <p className={`text-xs font-semibold lg:text-[clamp(0.7rem,1.3vh,1.1rem)] ${s.tie ? 'text-amber-300' : 'text-white/60'}`}>
              {s.role}
              {s.tie && ' · empate'}
            </p>
            {s.tie ? (
              // Empate: todos los nombres completos, sin recortar.
              <p className="font-bold leading-snug text-white text-lg lg:text-[clamp(0.9rem,2.1vh,1.8rem)]">
                {s.names.join(' y ')}
              </p>
            ) : (
              <p
                className={`flex items-center gap-1.5 truncate font-bold leading-snug text-white ${
                  i === 0 ? 'text-xl lg:text-[clamp(1rem,2.5vh,2.2rem)]' : 'text-lg lg:text-[clamp(0.9rem,2.1vh,1.8rem)]'
                }`}
              >
                {s.names.length ? (
                  <>
                    {i === 0 && <Trophy className="size-[1em] shrink-0 text-yellow-300" />}
                    <span className="truncate">{s.names[0]}</span>
                  </>
                ) : (
                  <span className="text-white/40">—</span>
                )}
              </p>
            )}
          </div>
        ))}
      </div>
      <ul className="mt-2 space-y-2 lg:mt-[0.8vh] lg:space-y-[0.5vh]">
        {position.candidates.map((c) => {
          const winner = position.winnerIds.includes(c.id);
          const seat = seatLabel(position, c.id);
          return (
            <li key={c.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm leading-tight lg:text-[clamp(0.75rem,1.6vh,1.35rem)]">
                <span className={`flex min-w-0 items-baseline gap-2 ${winner ? 'font-semibold text-white' : 'text-white/70'}`}>
                  <span className="truncate">{c.name}</span>
                  {seat && (
                    <span
                      className={`shrink-0 text-[0.75em] font-semibold uppercase tracking-wide ${seat.tie ? 'text-amber-300' : 'text-white/50'}`}
                    >
                      {seat.text}
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-white/80">
                  <span className="font-bold text-white">{c.votes}</span> · {c.pct}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10 lg:mt-[0.3vh] lg:h-[clamp(5px,0.75vh,10px)]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${winner ? accent : 'bg-white/35'}`}
                  style={{ width: `${c.pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Pantalla de resultados en grande (#/pantalla): sin sidebar ni menús, para proyector.
 * Mientras los resultados estén ocultos solo muestra la participación.
 */
export default function BigResultsPage() {
  const { api } = useAdmin();
  const [results, setResults] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(
    () =>
      api.getResults().then((data) => {
        setResults(data);
        setUpdatedAt(new Date().toISOString());
      }),
    [api],
  );
  usePolling(load, POLL_MS, true);

  if (!results) {
    return (
      <div className="flex h-screen items-center justify-center bg-navy-950">
        <Spinner className="size-12 text-white" />
      </div>
    );
  }

  const status = ELECTION_STATUS[results.election.status];

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-navy-950 text-white">
      <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-4 lg:gap-6 lg:px-[2vw] lg:py-[1.6vh]">
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight sm:text-2xl lg:truncate lg:text-[clamp(1.4rem,4.2vh,3.5rem)]">{results.election.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-white/60 lg:text-[clamp(0.8rem,1.7vh,1.4rem)]">
            <span className="inline-flex items-center gap-2">
              <span className={`size-[0.6em] rounded-full ${results.election.status === 'OPEN' ? 'animate-pulse bg-green-400' : 'bg-white/50'}`} />
              {status?.label}
            </span>
            <span>·</span>
            <span>Actualizado {formatTime(updatedAt)}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-4xl font-bold leading-none tabular-nums lg:text-[clamp(2rem,6vh,5.5rem)]">{results.ballots}</p>
          <p className="text-sm text-white/60 lg:text-[clamp(0.8rem,1.7vh,1.4rem)]">papeletas</p>
        </div>
      </header>

      {!results.visible ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <EyeOff className="mb-6 size-12 text-white/30 lg:mb-[3vh] lg:size-[clamp(3rem,6vw,7rem)]" />
          <p className="text-7xl font-bold leading-none tabular-nums lg:text-[clamp(4rem,12vw,14rem)]">{results.ballots}</p>
          <p className="mt-4 text-2xl font-semibold lg:mt-[2vh] lg:text-[clamp(1.5rem,3vw,3.5rem)]">papeletas registradas</p>
          <p className="mt-3 text-base text-white/60 lg:mt-[2vh] lg:text-[clamp(1rem,1.6vw,2rem)]">
            Los resultados se mostrarán al cerrar la votación.
          </p>
        </div>
      ) : (
        <main className="grid flex-1 gap-6 px-4 pb-6 lg:grid-cols-3 lg:gap-[1.2vw] lg:px-[2vw] lg:pb-[1.6vh]">
          {results.categories.map((cat) => {
            const s = directivaStyle(cat.id);
            const Icon = s.icon;
            return (
              <section key={cat.id} className="flex flex-col gap-3 lg:gap-[0.9vh]">
                <div className={`flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 lg:px-[1.4vw] lg:py-[0.9vh] ${s.band}`}>
                  <Icon className="size-6 lg:size-[clamp(1.2rem,3.2vh,2.5rem)]" />
                  <h2 className="text-2xl font-bold lg:text-[clamp(1.2rem,3.4vh,2.75rem)]">{cat.name}</h2>
                </div>
                {cat.positions.map((pos) => (
                  <PositionResult key={pos.id} position={pos} accent={s.band} />
                ))}
              </section>
            );
          })}
        </main>
      )}
    </div>
  );
}
