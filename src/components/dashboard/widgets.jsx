import { Trophy } from 'lucide-react';
import { actionLabel, formatTime } from '../../utils/format.js';
import { Card } from '../shared/ui.jsx';

export function StatCard({ icon: Icon, label, value, hint, tone = 'navy' }) {
  const tones = {
    navy: 'bg-navy-100 text-navy-800',
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <span className={`flex size-11 items-center justify-center rounded-xl ${tones[tone]}`}>
            <Icon className="size-6" />
          </span>
        )}
      </div>
    </Card>
  );
}

export function ActivityFeed({ items }) {
  if (!items?.length) return <p className="text-sm text-slate-500">Sin actividad todavía.</p>;
  return (
    <ul className="space-y-3">
      {items.map((l) => (
        <li key={l.id} className="flex gap-3 text-sm">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-navy-700/60" />
          <div className="min-w-0 flex-1">
            <p className="text-slate-800">
              {actionLabel(l.action)}
              {l.detail && <span className="text-slate-500"> · {l.detail}</span>}
            </p>
            <p className="text-xs text-slate-400">
              {formatTime(l.at)} · {l.actor === 'staff' ? 'Staff' : l.actor.startsWith('device:') ? l.actor.slice(7) : l.actor}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Barras horizontales de resultados para un cargo (sin librería de gráficos). */
export function ResultBars({ position, barClass = 'bg-navy-700' }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h4 className="font-semibold text-slate-900">{position.name}</h4>
        {position.tie && <span className="text-xs font-semibold text-amber-700">EMPATE</span>}
      </div>
      <ul className="space-y-2.5">
        {position.candidates.map((c) => {
          const winner = position.winnerIds.includes(c.id);
          return (
            <li key={c.id}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className={`flex min-w-0 items-center gap-1.5 ${winner ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                  {winner && <Trophy className={`size-4 shrink-0 ${position.tie ? 'text-amber-500' : 'text-yellow-500'}`} />}
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-slate-600">
                  <span className="font-semibold text-slate-900">{c.votes}</span> · {c.pct}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${winner ? barClass : 'bg-slate-400'}`}
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
