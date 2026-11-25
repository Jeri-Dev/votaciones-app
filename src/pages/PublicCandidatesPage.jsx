import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { UsersRound } from 'lucide-react';
import { callServer } from '../services/googleScript.js';
import { usePolling } from '../hooks/usePolling.js';
import { directivaStyle } from '../components/voting/directivas.js';
import { Avatar, Spinner } from '../components/shared/ui.jsx';
import { ELECTION_STATUS } from '../utils/format.js';
import { rolesHint } from '../utils/seats.js';

const POLL_MS = 60000;
const WIDE_QUERY = '(min-width: 1024px)';

function useIsWide() {
  const [wide, setWide] = useState(() => window.matchMedia?.(WIDE_QUERY).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(WIDE_QUERY);
    if (!mq) return undefined;
    const onChange = () => setWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return wide;
}

/**
 * Ajusta el zoom del contenido para que quepa entero en su contenedor, sin scroll.
 * Si ya cabe, queda en 100 %. Se recalcula al cambiar el tamaño de la ventana o los datos.
 */
function useFitToHeight(ref, deps) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      el.style.zoom = '1';
      for (let i = 0; i < 3; i++) {
        const need = el.scrollHeight;
        const avail = el.clientHeight;
        if (need <= avail + 1) break;
        const current = Number(el.style.zoom) || 1;
        el.style.zoom = String(Math.max(0.4, current * (avail / need)));
      }
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Vista para laptop/proyector: todos los candidatos en una sola pantalla, sin scroll. */
function WideLayout({ election, categories, status, offline }) {
  const fitRef = useRef(null);
  useFitToHeight(fitRef, [categories]);
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
      <header className="flex shrink-0 items-center justify-between gap-6 bg-navy-900 px-[2vw] py-[1.4vh] text-white">
        <div className="min-w-0">
          <p className="text-[1.6vh] font-semibold uppercase tracking-widest text-navy-100/70">Candidatos</p>
          <h1 className="truncate text-[3.8vh] font-bold leading-tight">{election?.name || 'Elección de directivas'}</h1>
        </div>
        {status && (
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-[1vw] py-[0.6vh] text-[1.7vh] font-medium">
            <span className={`size-[1vh] rounded-full ${election.status === 'OPEN' ? 'bg-green-400' : 'bg-white/50'}`} />
            {status.label}
            {offline && <span className="text-amber-300">· Reconectando…</span>}
          </span>
        )}
      </header>

      <div ref={fitRef} className="grid min-h-0 flex-1 grid-cols-3 gap-[1.2vw] overflow-hidden px-[1.5vw] py-[1.6vh]">
        {categories.map((cat) => {
          const s = directivaStyle(cat.id);
          const Icon = s.icon;
          return (
            <section key={cat.id} className="flex min-w-0 flex-col gap-[1.2vh]">
              <div className={`flex shrink-0 items-center gap-[0.8vw] rounded-2xl px-[1.2vw] py-[1vh] text-white ${s.band}`}>
                <Icon className="size-[3.2vh] shrink-0" />
                <h2 className="truncate text-[3vh] font-bold leading-tight">{cat.name}</h2>
              </div>
              {cat.positions.map((pos) => (
                <article key={pos.id} className="flex flex-1 flex-col rounded-2xl bg-white px-[1.1vw] py-[1.3vh] shadow-sm">
                  <h3 className="text-[2.4vh] font-bold leading-tight text-slate-900">{pos.name}</h3>
                  {rolesHint(pos.roles) && <p className="mt-[0.3vh] text-[1.5vh] leading-snug text-slate-500">{rolesHint(pos.roles)}</p>}
                  {pos.candidates.length === 0 ? (
                    <p className="mt-[1vh] text-[1.8vh] text-slate-400">Sin candidatos todavía</p>
                  ) : (
                    <ul className="mt-[1.2vh] grid grid-cols-2 gap-x-[0.8vw] gap-y-[1.2vh]">
                      {pos.candidates.map((c) => (
                        <li key={c.id} className="flex min-w-0 items-center gap-[0.6vw]">
                          <Avatar name={c.name} photoUrl={c.photo_url} className="size-[6vh] text-[2.1vh]" tone={s.avatar} />
                          <span className="min-w-0 text-[2.1vh] font-semibold leading-tight text-slate-900">{c.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Lista pública de candidatos (/public-candidatos o ?view=candidatos). Sin llave.
 * Solo nombres y fotos por directiva y votación: nunca votos ni resultados.
 * En pantallas de 1024 px o más, todos los candidatos caben en una sola pantalla (sin scroll).
 */
export default function PublicCandidatesPage() {
  const [data, setData] = useState(null);
  const [offline, setOffline] = useState(false);
  const wide = useIsWide();

  const load = useCallback(
    () =>
      callServer('publicApi', 'candidates').then(
        (d) => {
          setData(d);
          setOffline(false);
        },
        () => setOffline(true),
      ),
    [],
  );
  usePolling(load, POLL_MS, true);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100 text-slate-500">
        {offline ? <p className="text-lg">Sin conexión. Reintentando…</p> : <Spinner className="size-10" />}
      </div>
    );
  }

  const { election, categories } = data;
  const total = categories.reduce((n, c) => n + c.positions.reduce((m, p) => m + p.candidates.length, 0), 0);
  const status = election && ELECTION_STATUS[election.status];

  // Laptop / proyector: todo en una pantalla. Celular: lista con scroll.
  if (wide && total > 0) {
    return <WideLayout election={election} categories={categories} status={status} offline={offline} />;
  }

  return (
    <div className="min-h-full bg-slate-100">
      <header className="bg-navy-900 px-4 pb-6 pt-8 text-center text-white sm:pb-8 sm:pt-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-navy-100/70 sm:text-base">Candidatos</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-5xl">{election?.name || 'Elección de directivas'}</h1>
        {election?.description && <p className="mx-auto mt-3 max-w-2xl text-base text-navy-100 sm:text-lg">{election.description}</p>}
        {status && (
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
            <span className={`size-2 rounded-full ${election.status === 'OPEN' ? 'bg-green-400' : 'bg-white/50'}`} />
            {status.label}
          </span>
        )}
      </header>

      {categories.length > 1 && (
        <nav
          aria-label="Directivas"
          className="sticky top-0 z-10 flex justify-center gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur"
        >
          {categories.map((cat) => {
            const s = directivaStyle(cat.id);
            const Icon = s.icon;
            return (
              <a
                key={cat.id}
                href={`#directiva-${cat.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(`directiva-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`inline-flex min-w-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold sm:px-4 sm:text-base ${s.soft} ${s.text}`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{cat.name}</span>
              </a>
            );
          })}
        </nav>
      )}

      <main className="mx-auto max-w-6xl space-y-10 px-3 py-6 sm:px-6 sm:py-10">
        {total === 0 && (
          <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center shadow-sm">
            <UsersRound className="mb-3 size-10 text-slate-400" />
            <p className="text-lg font-semibold text-slate-700">Aún no hay candidatos registrados</p>
          </div>
        )}

        {total > 0 &&
          categories.map((cat) => {
            const s = directivaStyle(cat.id);
            const Icon = s.icon;
            return (
              <section key={cat.id} id={`directiva-${cat.id}`} className="scroll-mt-16">
                <div className={`mb-4 flex items-center gap-3 rounded-3xl px-5 py-4 text-white sm:px-6 ${s.band}`}>
                  <Icon className="size-7 sm:size-9" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-white/80 sm:text-sm">Directiva de</p>
                    <h2 className="text-2xl font-bold sm:text-3xl">{cat.name}</h2>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {cat.positions.map((pos) => (
                    <article key={pos.id} className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                      <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">{pos.name}</h3>
                      {rolesHint(pos.roles) && <p className="mt-1 text-sm text-slate-500 sm:text-base">{rolesHint(pos.roles)}</p>}
                      {pos.candidates.length === 0 ? (
                        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-slate-500">Sin candidatos todavía</p>
                      ) : (
                        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                          {pos.candidates.map((c) => (
                            <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                              <Avatar name={c.name} photoUrl={c.photo_url} className="size-14 text-lg" tone={s.avatar} />
                              <span className="min-w-0 text-lg font-semibold leading-snug text-slate-900">{c.name}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
      </main>

      {offline && (
        <p className="fixed bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-800 shadow">
          Reconectando…
        </p>
      )}
    </div>
  );
}
