import { Vote } from 'lucide-react';
import { useKiosk } from '../../context/KioskContext.jsx';
import { Button, Spinner } from '../shared/ui.jsx';
import { directivaStyle } from './directivas.js';

export function WelcomeScreen() {
  const { state, start } = useKiosk();
  const categories = state.ballot?.categories || [];

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center bg-linear-to-b from-navy-900 to-navy-800 px-6 py-12 text-center text-white">
      <div className="flex max-w-3xl animate-fade-in flex-col items-center">
        <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-white/10 sm:mb-8 sm:size-28">
          <Vote className="size-11 sm:size-16" />
        </div>
        <p className="text-base font-medium uppercase tracking-widest text-navy-100/80 sm:text-xl">Bienvenido</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-6xl">{state.election?.name || 'Elección de directivas'}</h1>
        <p className="mt-5 text-xl leading-relaxed text-navy-100 sm:mt-6 sm:text-2xl">
          En cada directiva votará por la Presidencia y por la Secretaría. El segundo más votado será
          Vicepresidente o Tesorero.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3 sm:mt-10 sm:gap-4">
          {categories.map((cat) => {
            const s = directivaStyle(cat.id);
            const Icon = s.icon;
            return (
              <span key={cat.id} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-lg font-semibold sm:gap-3 sm:px-5 sm:py-3 sm:text-2xl">
                <Icon className="size-5 sm:size-7" /> {cat.name}
              </span>
            );
          })}
        </div>

        <div className="mt-10 w-full max-w-xl sm:mt-14">
          {state.ballot ? (
            <Button variant="success" size="xl" className="w-full shadow-lg shadow-green-900/30" onClick={start}>
              Comenzar a votar
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-3 text-xl text-navy-100">
              <Spinner className="size-7 text-white" /> Preparando la papeleta…
            </div>
          )}
        </div>
      </div>
      {state.device?.name && <p className="absolute bottom-6 text-base text-navy-100/50">Estación: {state.device.name}</p>}
    </div>
  );
}
