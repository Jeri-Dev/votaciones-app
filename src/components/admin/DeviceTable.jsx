import { useEffect, useState } from 'react';
import { Ban, History, Lock, LockOpen, RotateCcw } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext.jsx';
import { DEVICE_STATUS, actionLabel, formatTime, timeAgo } from '../../utils/format.js';
import { Badge, Button, ConfirmDialog, Modal, Spinner } from '../shared/ui.jsx';

const ONLINE_WINDOW_MS = 45000;

export const isOnline = (device, serverTime) =>
  Boolean(device.last_activity) && new Date(serverTime).getTime() - new Date(device.last_activity).getTime() < ONLINE_WINDOW_MS;

const ACTIONS = {
  activateDevice: { label: 'Habilitar', icon: LockOpen, done: 'Estación habilitada para el siguiente votante' },
  lockDevice: { label: 'Bloquear', icon: Lock, done: 'Estación bloqueada' },
  resetDevice: {
    label: 'Reiniciar',
    icon: RotateCcw,
    done: 'Estación reiniciada',
    confirm: 'La estación descartará cualquier papeleta a medio llenar (sin registrarla) y volverá a la bienvenida. Los votos ya registrados no se tocan.',
  },
  disableDevice: {
    label: 'Deshabilitar',
    icon: Ban,
    done: 'Estación deshabilitada',
    confirm: 'La estación mostrará “Fuera de servicio” y no podrá usarse hasta que la habilite de nuevo. Los votos ya registrados no se tocan.',
  },
};

function actionsFor(status) {
  switch (status) {
    case 'LOCKED':
      return ['activateDevice', 'disableDevice'];
    case 'READY':
      return ['lockDevice', 'resetDevice', 'disableDevice'];
    case 'VOTING':
      return ['lockDevice', 'resetDevice', 'disableDevice'];
    case 'DISABLED':
      return ['activateDevice'];
    default:
      return [];
  }
}

function ActivityModal({ device, onClose }) {
  const { api } = useAdmin();
  const [logs, setLogs] = useState(null);
  useEffect(() => {
    if (!device) return undefined;
    let cancelled = false;
    api.getAuditLogs({ deviceId: device.id, limit: 100 }).then(
      (data) => !cancelled && setLogs(data),
      () => !cancelled && setLogs([]),
    );
    return () => {
      cancelled = true;
    };
  }, [api, device]);
  return (
    <Modal open={Boolean(device)} onClose={onClose} title={`Actividad · ${device?.name || ''}`} size="lg">
      {logs === null ? (
        <Spinner />
      ) : logs.length === 0 ? (
        <p className="text-sm text-slate-500">Sin actividad registrada.</p>
      ) : (
        <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto text-sm">
          {logs.map((l) => (
            <li key={l.id} className="flex justify-between gap-4 py-2">
              <span className="text-slate-800">
                {actionLabel(l.action)}
                {l.detail && <span className="text-slate-400"> · {l.detail}</span>}
              </span>
              <span className="shrink-0 text-slate-500">{formatTime(l.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export function DeviceTable({ compact = false }) {
  const { dashboard, api, run } = useAdmin();
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(null);
  const [activity, setActivity] = useState(null);
  const devices = dashboard.devices;

  const execute = async (action, device) => {
    setBusy(`${action}:${device.id}`);
    await run(() => api.deviceAction(action, device.id), `${ACTIONS[action].done}: ${device.name}`);
    setBusy(null);
    setConfirming(null);
  };

  const request = (action, device) => {
    if (ACTIONS[action].confirm || (action === 'lockDevice' && device.status === 'VOTING')) setConfirming({ action, device });
    else execute(action, device);
  };

  if (!devices.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        Aún no hay estaciones registradas. Abra la app en cada tablet para registrarla.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-2 pr-4 font-medium">Estación</th>
            <th className="py-2 pr-4 font-medium">Estado</th>
            <th className="py-2 pr-4 font-medium">Última actividad</th>
            {!compact && <th className="py-2 font-medium">Acciones</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {devices.map((d) => {
            const s = DEVICE_STATUS[d.status] || { label: d.status, tone: 'slate' };
            const online = isOnline(d, dashboard.serverTime);
            return (
              <tr key={d.id} className="align-middle">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span className={`size-2.5 rounded-full ${online ? 'bg-green-500' : 'bg-slate-300'}`} title={online ? 'En línea' : 'Sin conexión reciente'} />
                    <span className="font-semibold text-slate-900">{d.name}</span>
                  </div>
                  <span className="ml-4.5 text-xs text-slate-400">{d.id}</span>
                </td>
                <td className="py-3 pr-4">
                  <Badge tone={s.tone} dot>
                    {s.label}
                  </Badge>
                </td>
                <td className="py-3 pr-4 text-slate-600">{timeAgo(d.last_activity, new Date(dashboard.serverTime).getTime())}</td>
                {!compact && (
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {actionsFor(d.status).map((action) => (
                        <Button
                          key={action}
                          size="sm"
                          variant={action === 'activateDevice' ? 'success' : 'secondary'}
                          icon={ACTIONS[action].icon}
                          loading={busy === `${action}:${d.id}`}
                          onClick={() => request(action, d)}
                        >
                          {ACTIONS[action].label}
                        </Button>
                      ))}
                      <Button size="sm" variant="ghost" icon={History} onClick={() => setActivity(d)}>
                        Actividad
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <ConfirmDialog
        open={Boolean(confirming)}
        title={confirming && `${ACTIONS[confirming.action].label} · ${confirming.device.name}`}
        message={
          confirming &&
          (ACTIONS[confirming.action].confirm || 'Hay una persona votando en esta estación. Si la bloquea, su papeleta se descartará sin registrarse.')
        }
        confirmLabel={confirming && ACTIONS[confirming.action].label}
        variant={confirming?.action === 'disableDevice' ? 'danger' : 'primary'}
        loading={Boolean(busy)}
        onConfirm={() => execute(confirming.action, confirming.device)}
        onCancel={() => setConfirming(null)}
      />
      <ActivityModal key={activity?.id || 'none'} device={activity} onClose={() => setActivity(null)} />
    </div>
  );
}
