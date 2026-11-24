import { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, CircleCheck } from 'lucide-react';
import { useKiosk } from '../../context/KioskContext.jsx';
import { ballotProgress } from '../../utils/ballot.js';
import { rolesHint } from '../../utils/seats.js';
import { Avatar, Button } from '../shared/ui.jsx';
import { directivaStyle } from './directivas.js';

function CandidateCard({ candidate, selected, onSelect, style }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex min-h-20 w-full items-center gap-3 rounded-2xl border-4 p-3 text-left transition-all duration-150 active:scale-[0.98] sm:min-h-24 sm:gap-4 sm:p-4 ${
        selected ? 'animate-pop border-green-600 bg-green-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <Avatar name={candidate.name} photoUrl={candidate.photo_url} className="size-12 text-lg sm:size-16 sm:text-2xl" tone={style.avatar} />
      <span className="min-w-0 flex-1 text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">{candidate.name}</span>
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-full border-4 transition-colors sm:size-12 ${
          selected ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300 bg-white'
        }`}
        aria-hidden="true"
      >
        {selected && <Check className="size-6 sm:size-8" strokeWidth={3.5} />}
      </span>
    </button>
  );
}

function PositionBlock({ position, categoryName, selectedId, onSelect, highlighted, style, registerRef }) {
  const done = Boolean(selectedId);
  return (
    <section
      ref={registerRef}
      className={`scroll-mt-36 rounded-3xl bg-white p-4 shadow-sm ring-4 transition-shadow sm:scroll-mt-44 sm:p-6 ${
        highlighted ? 'animate-pulse-ring ring-amber-400' : done ? 'ring-green-500/30' : 'ring-transparent'
      }`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {position.name}
          <span className="sr-only"> de {categoryName}</span>
        </h3>
        {done ? (
          <span className="inline-flex items-center gap-2 text-lg font-semibold text-green-700 sm:text-xl">
            <CircleCheck className="size-6 sm:size-7" /> Listo
          </span>
        ) : (
          <span className="text-lg text-slate-500 sm:text-xl">Toque una persona</span>
        )}
      </div>
      {rolesHint(position.roles) && (
        <p className="-mt-2 mb-4 text-base text-slate-600 sm:text-lg">{rolesHint(position.roles)}</p>
      )}
      <div role="radiogroup" aria-label={`${position.name} de ${categoryName}`} className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {position.candidates.map((c) => (
          <CandidateCard key={c.id} candidate={c} selected={selectedId === c.id} onSelect={() => onSelect(position.id, c.id)} style={style} />
        ))}
      </div>
    </section>
  );
}

/** Papeleta única: las tres directivas en la misma página, cada una con sus 4 cargos. */
export function BallotScreen() {
  const { state, select, review } = useKiosk();
  const categories = state.ballot.categories;
  const progress = ballotProgress(categories, state.selections);
  const [highlight, setHighlight] = useState(null);
  const [hint, setHint] = useState('');
  const refs = useRef({});

  useEffect(() => {
    if (highlight && state.selections[highlight]) {
      setHighlight(null);
      setHint('');
    }
  }, [highlight, state.selections]);

  const scrollTo = (id, block = 'center') => refs.current[id]?.scrollIntoView({ behavior: 'smooth', block });

  const onReview = () => {
    if (progress.complete) {
      window.scrollTo({ top: 0 });
      review();
      return;
    }
    const first = progress.missing[0];
    const cat = categories.find((c) => c.positions.some((p) => p.id === first));
    const pos = cat.positions.find((p) => p.id === first);
    setHighlight(first);
    setHint(`Falta elegir: ${pos.name} de ${cat.name}`);
    scrollTo(first);
  };

  return (
    <div className="min-h-full bg-slate-100 pb-36 sm:pb-44">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-6xl px-3 py-2 sm:px-4 sm:py-3">
          <p className="hidden text-center text-lg font-medium text-slate-500 sm:block">{state.ballot.election.name}</p>
          <nav className="grid grid-cols-3 gap-2 sm:mt-2 sm:gap-3" aria-label="Directivas">
            {categories.map((cat) => {
              const s = directivaStyle(cat.id);
              const Icon = s.icon;
              const p = progress.byCategory[cat.id];
              const complete = p.done === p.total;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => scrollTo(cat.id, 'start')}
                  className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-2 text-base font-semibold sm:flex-row sm:gap-2 sm:px-3 sm:py-3 sm:text-xl ${s.soft} ${s.text} active:scale-[0.98]`}
                >
                  <Icon className="hidden size-6 shrink-0 sm:block" />
                  <span className="max-w-full truncate">{cat.name}</span>
                  {complete ? (
                    <CircleCheck className="size-5 shrink-0 text-green-600 sm:size-7" aria-label="completa" />
                  ) : (
                    <span className="shrink-0 text-sm opacity-70 sm:text-base">
                      {p.done}/{p.total}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-3 pt-4 sm:space-y-12 sm:px-4 sm:pt-6">
        {categories.map((cat) => {
          const s = directivaStyle(cat.id);
          const Icon = s.icon;
          return (
            <div key={cat.id} ref={(el) => (refs.current[cat.id] = el)} className="scroll-mt-24 sm:scroll-mt-36">
              <div className={`mb-4 flex items-center gap-3 rounded-3xl px-5 py-4 text-white sm:mb-5 sm:gap-4 sm:px-6 sm:py-5 ${s.band}`}>
                <Icon className="size-8 sm:size-10" />
                <div>
                  <p className="text-sm font-medium uppercase tracking-wider text-white/80 sm:text-lg">Directiva de</p>
                  <h2 className="text-3xl font-bold sm:text-4xl">{cat.name}</h2>
                </div>
              </div>
              <div className="space-y-4 sm:space-y-5">
                {cat.positions.map((pos) => (
                  <PositionBlock
                    key={pos.id}
                    position={pos}
                    categoryName={cat.name}
                    selectedId={state.selections[pos.id]}
                    onSelect={select}
                    highlighted={highlight === pos.id}
                    style={s}
                    registerRef={(el) => (refs.current[pos.id] = el)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white px-3 py-3 shadow-[0_-8px_24px_rgb(15_23_42/0.08)] sm:px-4 sm:py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3 sm:gap-5">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-slate-900 sm:text-2xl">
              {progress.done} de {progress.total} listos
            </p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200 sm:h-4">
              <div
                className="h-full rounded-full bg-green-600 transition-all duration-300"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
            <p className="mt-1 h-6 truncate text-base font-medium text-amber-700 sm:h-7 sm:text-lg" role="status">
              {hint}
            </p>
          </div>
          <Button variant={progress.complete ? 'success' : 'primary'} size="xl" onClick={onReview} className="shrink-0">
            <span>
              Revisar<span className="hidden sm:inline"> mi voto</span>
            </span>
            <ChevronRight className="size-6 sm:size-8" />
          </Button>
        </div>
      </div>
    </div>
  );
}
