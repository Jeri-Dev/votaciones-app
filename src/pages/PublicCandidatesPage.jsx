import { useCallback, useState } from 'react';
import { UsersRound } from 'lucide-react';
import { callServer } from '../services/googleScript.js';
import { usePolling } from '../hooks/usePolling.js';
import { directivaStyle } from '../components/voting/directivas.js';
import { Avatar, Spinner } from '../components/shared/ui.jsx';
import { ELECTION_STATUS } from '../utils/format.js';
import { rolesHint } from '../utils/seats.js';

const POLL_MS = 60000;

/**
 * Lista pública de candidatos (/public-candidatos o ?view=candidatos). Sin llave.
 * Solo nombres y fotos por directiva y votación: nunca votos ni resultados.
 */
export default function PublicCandidatesPage() {
  const [data, setData] = useState(null);
  const [offline, setOffline] = useState(false);

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
