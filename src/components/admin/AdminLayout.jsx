import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { ChartColumn, CircleAlert, CircleCheck, LayoutDashboard, Menu, Settings, Tablet, UsersRound, Vote, WifiOff, X } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext.jsx';
import { ELECTION_STATUS } from '../../utils/format.js';
import { Badge } from '../shared/ui.jsx';

const NAV = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/candidatos', label: 'Candidatos', icon: UsersRound },
  { to: '/estaciones', label: 'Estaciones', icon: Tablet },
  { to: '/resultados', label: 'Resultados', icon: ChartColumn },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
];

function NavItems({ onNavigate }) {
  return (
    <nav className="space-y-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? 'bg-white/15 text-white' : 'text-navy-100/80 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <Icon className="size-5" /> {label}
        </NavLink>
      ))}
    </nav>
  );
}

function Toast() {
  const { toast } = useAdmin();
  if (!toast) return null;
  const error = toast.tone === 'error';
  const Icon = error ? CircleAlert : CircleCheck;
  return (
    <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 animate-fade-in" role="status">
      <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${error ? 'bg-red-600' : 'bg-slate-900'}`}>
        <Icon className="size-5" /> {toast.message}
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { dashboard, error } = useAdmin();
  const [open, setOpen] = useState(false);
  const election = dashboard?.election;
  const status = election && ELECTION_STATUS[election.status];

  const brand = (
    <div className="mb-8 flex items-center gap-3 px-2">
      <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
        <Vote className="size-6 text-white" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">Votación Iglesia</p>
        <p className="text-xs text-navy-100/70">Panel del staff</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-full bg-slate-100">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-navy-900 p-4 lg:flex">
        {brand}
        <NavItems />
        <div className="mt-auto rounded-xl bg-white/5 p-3 text-xs text-navy-100/80">
          <p className="font-semibold text-white">{election?.name}</p>
          {status && <p className="mt-1">{status.label}</p>}
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-72 bg-navy-900 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-white" aria-label="Cerrar menú">
                <X className="size-6" />
              </button>
            </div>
            {brand}
            <NavItems onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Abrir menú">
            <Menu className="size-6" />
          </button>
          <p className="min-w-0 truncate text-sm font-semibold text-slate-800">{election?.name || 'Sin elección'}</p>
          {status && (
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
          )}
          {error && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <WifiOff className="size-4" /> Reconectando…
            </span>
          )}
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
      <Toast />
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
