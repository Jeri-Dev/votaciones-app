import { ChevronLeft, Check } from 'lucide-react';
import { useKiosk } from '../../context/KioskContext.jsx';
import { findCandidate } from '../../utils/ballot.js';
import { Avatar, Button } from '../shared/ui.jsx';
import { directivaStyle } from './directivas.js';

export function ReviewScreen() {
  const { state, backToBallot, submit } = useKiosk();
  const categories = state.ballot.categories;

  return (
    <div className="min-h-full bg-slate-100 pb-44 sm:pb-48">
      <header className="bg-navy-900 px-4 py-6 text-center text-white sm:px-6 sm:py-8">
        <h1 className="text-3xl font-bold sm:text-5xl">Revise su voto</h1>
        <p className="mt-2 text-lg text-navy-100 sm:mt-3 sm:text-2xl">Estas son las personas que usted eligió.</p>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-3 pt-4 sm:gap-6 sm:px-4 sm:pt-6 lg:grid-cols-3">
        {categories.map((cat) => {
          const s = directivaStyle(cat.id);
          const Icon = s.icon;
          return (
            <section key={cat.id} className="overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className={`flex items-center gap-3 px-4 py-3 text-white sm:px-5 sm:py-4 ${s.band}`}>
                <Icon className="size-6 sm:size-8" />
                <h2 className="text-2xl font-bold sm:text-3xl">{cat.name}</h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {cat.positions.map((pos) => {
                  const c = findCandidate(categories, pos.id, state.selections[pos.id]);
                  return (
                    <li key={pos.id} className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
                      <Avatar name={c?.name} photoUrl={c?.photo_url} className="size-11 text-base sm:size-14 sm:text-xl" tone={s.avatar} />
                      <div className="min-w-0">
                        <p className="text-base font-medium text-slate-500 sm:text-lg">{pos.name}</p>
                        <p className="text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">{c?.name}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white px-3 py-3 shadow-[0_-8px_24px_rgb(15_23_42/0.08)] sm:px-4 sm:py-5">
        <p className="mb-2 text-center text-base text-slate-600 sm:mb-3 sm:text-xl">Al confirmar, su voto ya no se podrá cambiar.</p>
        <div className="mx-auto grid max-w-4xl grid-cols-[1fr_1.6fr] gap-3 sm:gap-4">
          <Button variant="secondary" size="xl" onClick={backToBallot}>
            <ChevronLeft className="size-6 sm:size-8" /> Cambiar
          </Button>
          <Button variant="success" size="xl" onClick={submit} className="shadow-lg shadow-green-900/20">
            <Check className="size-6 sm:size-8" strokeWidth={3} /> Confirmar<span className="hidden sm:inline">&nbsp;mi voto</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
