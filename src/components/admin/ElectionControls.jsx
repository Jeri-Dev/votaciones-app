import { useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext.jsx';
import { Button, ConfirmDialog } from '../shared/ui.jsx';

const ACTIONS = {
  OPEN: {
    label: 'Abrir votación',
    icon: Play,
    variant: 'success',
    title: '¿Abrir la votación?',
    message: 'Las estaciones habilitadas podrán recibir votos. Desde este momento los candidatos ya no se pueden modificar.',
    done: 'Votación abierta',
  },
  RESUME: {
    status: 'OPEN',
    label: 'Reanudar',
    icon: Play,
    variant: 'success',
    title: '¿Reanudar la votación?',
    message: 'Las estaciones volverán a aceptar votos.',
    done: 'Votación reanudada',
  },
  PAUSED: {
    label: 'Pausar',
    icon: Pause,
    variant: 'secondary',
    title: '¿Pausar la votación?',
    message: 'Las estaciones mostrarán “Votación en pausa”. Quien esté votando conserva su papeleta y podrá terminar al reanudar.',
    done: 'Votación en pausa',
  },
  CLOSED: {
    label: 'Cerrar votación',
    icon: Square,
    variant: 'danger',
    title: '¿Cerrar la votación definitivamente?',
    message: 'No se aceptarán más votos, todas las estaciones se bloquearán y se mostrarán los resultados. Esta acción no se puede deshacer.',
    done: 'Votación cerrada',
  },
};

const AVAILABLE = {
  DRAFT: ['OPEN'],
  OPEN: ['PAUSED', 'CLOSED'],
  PAUSED: ['RESUME', 'CLOSED'],
  CLOSED: [],
};

export function ElectionControls({ size = 'md' }) {
  const { dashboard, api, run } = useAdmin();
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const status = dashboard?.election?.status;
  if (!status) return null;

  const confirm = async () => {
    const action = ACTIONS[pending];
    setBusy(true);
    await run(() => api.setElectionStatus(action.status || pending), action.done);
    setBusy(false);
    setPending(null);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {AVAILABLE[status].map((key) => {
        const a = ACTIONS[key];
        return (
          <Button key={key} variant={a.variant} size={size} icon={a.icon} onClick={() => setPending(key)}>
            {a.label}
          </Button>
        );
      })}
      <ConfirmDialog
        open={Boolean(pending)}
        title={pending && ACTIONS[pending].title}
        message={pending && ACTIONS[pending].message}
        confirmLabel={pending && ACTIONS[pending].label}
        variant={pending && ACTIONS[pending].variant === 'secondary' ? 'primary' : pending && ACTIONS[pending].variant}
        loading={busy}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
