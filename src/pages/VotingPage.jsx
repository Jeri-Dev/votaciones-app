import { Ban, CircleAlert, CirclePause, CircleX, LoaderCircle, WifiOff } from 'lucide-react';
import { KioskProvider, useKiosk } from '../context/KioskContext.jsx';
import { VOTER_PHASES } from '../context/kioskReducer.js';
import { useIdleTimer } from '../hooks/useIdleTimer.js';
import { useWakeLock } from '../pwa.js';
import { StatusScreen } from '../components/voting/StatusScreen.jsx';
import { LockScreen } from '../components/voting/LockScreen.jsx';
import { RegisterStation } from '../components/voting/RegisterStation.jsx';
import { WelcomeScreen } from '../components/voting/WelcomeScreen.jsx';
import { BallotScreen } from '../components/voting/BallotScreen.jsx';
import { ReviewScreen } from '../components/voting/ReviewScreen.jsx';
import { Button } from '../components/shared/ui.jsx';

const IDLE_WARN_MS = 3 * 60 * 1000;
const IDLE_RESET_MS = 4 * 60 * 1000;

function IdleWarning() {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy-950/70 p-6">
      <div className="max-w-xl animate-fade-in rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-10">
        <h2 className="text-3xl font-bold text-navy-950 sm:text-4xl">¿Sigue ahí?</h2>
        <p className="mt-4 text-xl text-slate-600 sm:text-2xl">Toque la pantalla para continuar votando.</p>
        <Button size="xl" className="mt-8 w-full">
          Sí, continuar
        </Button>
      </div>
    </div>
  );
}

function SubmittingScreen({ attempt }) {
  return (
    <StatusScreen
      icon={LoaderCircle}
      iconClass={`bg-navy-100 text-navy-700 [&>svg]:animate-spin`}
      title="Registrando su voto…"
      message={
        attempt > 0
          ? `La conexión está lenta. Reintentando (${attempt})… Por favor no se retire.`
          : 'Por favor espere y no toque la pantalla.'
      }
    />
  );
}

function FailedScreen() {
  const { state, backToBallot, dismissFailure } = useKiosk();
  const code = state.failure?.code;
  const canReturn = code === 'ELECTION_NOT_OPEN' || code === 'VALIDATION';
  return (
    <StatusScreen
      icon={CircleX}
      iconClass="bg-red-100 text-red-600"
      title="Su voto NO fue registrado"
      message={state.failure?.message || 'Ocurrió un problema. Llame al staff.'}
    >
      {canReturn && state.ballot ? (
        <Button size="xl" className="w-full" onClick={backToBallot}>
          Volver a mi papeleta
        </Button>
      ) : (
        <Button size="xl" variant="secondary" className="w-full" onClick={dismissFailure}>
          Entendido, llamar al staff
        </Button>
      )}
    </StatusScreen>
  );
}

function KioskScreens() {
  const { state, idleReset } = useKiosk();
  // La tablet no debe apagar la pantalla entre votantes.
  useWakeLock(true);
  const voting = state.phase === 'ballot' || state.phase === 'review';
  const { warning } = useIdleTimer({ warnMs: IDLE_WARN_MS, timeoutMs: IDLE_RESET_MS, onTimeout: idleReset, enabled: voting });

  let screen;
  switch (state.phase) {
    case 'loading':
      screen = <StatusScreen icon={LoaderCircle} iconClass="bg-navy-100 text-navy-700 [&>svg]:animate-spin" title="Conectando…" />;
      break;
    case 'offline':
      screen = (
        <StatusScreen
          icon={WifiOff}
          iconClass="bg-amber-100 text-amber-700"
          title="Sin conexión"
          message="Reintentando automáticamente. Verifique el Wi-Fi de la tablet."
        />
      );
      break;
    case 'unregistered':
      screen = <RegisterStation />;
      break;
    case 'locked':
      screen = <LockScreen />;
      break;
    case 'disabled':
      screen = (
        <StatusScreen
          icon={Ban}
          iconClass="bg-red-100 text-red-600"
          title="Estación fuera de servicio"
          message="Por favor use otra estación o consulte al staff."
          footer={state.device?.name && `Estación: ${state.device.name}`}
        />
      );
      break;
    case 'closed':
      screen = (
        <StatusScreen
          icon={state.election?.status === 'PAUSED' ? CirclePause : CircleAlert}
          iconClass="bg-amber-100 text-amber-700"
          title={state.election?.status === 'PAUSED' ? 'Votación en pausa' : 'La votación no está abierta'}
          message={
            state.election?.status === 'PAUSED'
              ? 'Espere un momento, por favor. La votación continuará en breve.'
              : 'Consulte al staff para más información.'
          }
          footer={state.device?.name && `Estación: ${state.device.name}`}
        />
      );
      break;
    case 'welcome':
      screen = <WelcomeScreen />;
      break;
    case 'ballot':
      screen = <BallotScreen />;
      break;
    case 'review':
      screen = <ReviewScreen />;
      break;
    case 'submitting':
      screen = <SubmittingScreen attempt={state.submitAttempt} />;
      break;
    case 'failed':
      screen = <FailedScreen />;
      break;
    default:
      screen = null;
  }

  return (
    <div className="kiosk h-full">
      {screen}
      {warning && VOTER_PHASES.includes(state.phase) && <IdleWarning />}
    </div>
  );
}

export default function VotingPage() {
  return (
    <KioskProvider>
      <KioskScreens />
    </KioskProvider>
  );
}
