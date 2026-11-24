import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { kioskReducer, initialKioskState, POLL_FAST_PHASES } from './kioskReducer.js';
import { deviceService, deviceToken } from '../services/deviceService.js';
import { votingService, pendingBallot, newBallotId } from '../services/votingService.js';
import { isRetryable } from '../services/googleScript.js';
import { usePolling } from '../hooks/usePolling.js';

const KioskContext = createContext(null);

const FAST_POLL_MS = 5000;
const SLOW_POLL_MS = 15000;
const backoffMs = (attempt) => Math.min(1000 * 2 ** attempt, 10000);

export function KioskProvider({ children }) {
  const [state, dispatch] = useReducer(kioskReducer, null, () =>
    initialKioskState(Boolean(pendingBallot.get())),
  );
  const pendingRef = useRef(pendingBallot.get());

  const handleError = useCallback((err) => {
    if (err?.code === 'UNREGISTERED') {
      deviceToken.clear();
      dispatch({ type: 'UNREGISTERED' });
    } else if (err?.code === 'NETWORK') {
      dispatch({ type: 'OFFLINE' });
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!deviceToken.get()) {
      dispatch({ type: 'UNREGISTERED' });
      return;
    }
    try {
      const data = await deviceService.status();
      dispatch({ type: 'SERVER_STATUS', device: data.device, election: data.election });
    } catch (err) {
      handleError(err);
    }
  }, [handleError]);

  // Polling: rápido cuando la estación espera al staff; lento mientras alguien vota.
  const pollMs = POLL_FAST_PHASES.includes(state.phase) ? FAST_POLL_MS : SLOW_POLL_MS;
  const pollEnabled = state.phase !== 'unregistered' && state.phase !== 'submitting';
  usePolling(refreshStatus, pollMs, pollEnabled);

  // Cargar la papeleta al empezar cada sesión (reintenta si falla la red).
  useEffect(() => {
    if (state.phase !== 'welcome' || state.ballot) return undefined;
    let cancelled = false;
    let timer = null;
    const load = () =>
      votingService
        .getBallot()
        .then((ballot) => !cancelled && dispatch({ type: 'SET_BALLOT', ballot }))
        .catch((err) => {
          if (cancelled) return;
          handleError(err);
          timer = setTimeout(load, 3000);
        });
    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [state.phase, state.ballot, state.session, handleError]);

  // Envío con reintentos. Siempre con el mismo ballotId → el servidor no duplica.
  useEffect(() => {
    if (state.phase !== 'submitting') return undefined;
    let cancelled = false;
    let timer = null;

    const attempt = async (n) => {
      const pending = pendingRef.current || pendingBallot.get();
      if (!pending) {
        dispatch({ type: 'SUBMIT_FAILED', error: { code: 'INTERNAL', message: 'No se encontró la papeleta.' } });
        return;
      }
      try {
        await votingService.submit(pending);
        if (cancelled) return;
        pendingBallot.clear();
        pendingRef.current = null;
        dispatch({ type: 'SUBMIT_SUCCESS' });
      } catch (err) {
        if (cancelled) return;
        if (isRetryable(err)) {
          dispatch({ type: 'SUBMIT_RETRY', attempt: n + 1 });
          timer = setTimeout(() => attempt(n + 1), backoffMs(n));
          return;
        }
        pendingBallot.clear();
        pendingRef.current = null;
        if (err.code === 'UNREGISTERED') return handleError(err);
        dispatch({ type: 'SUBMIT_FAILED', error: { code: err.code, message: err.message } });
      }
    };

    attempt(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [state.phase, handleError]);

  const actions = useMemo(
    () => ({
      refreshStatus,
      async register(name) {
        const data = await deviceService.register(name);
        dispatch({ type: 'SERVER_STATUS', device: data.device, election: null });
        refreshStatus();
      },
      async unlock() {
        const data = await deviceService.unlock();
        dispatch({ type: 'SERVER_STATUS', device: data.device });
      },
      start() {
        dispatch({ type: 'START' });
        votingService.start().catch(handleError);
      },
      select: (positionId, candidateId) => dispatch({ type: 'SELECT', positionId, candidateId }),
      review: () => dispatch({ type: 'REVIEW' }),
      backToBallot: () => dispatch({ type: 'BACK_TO_BALLOT' }),
      dismissFailure: () => dispatch({ type: 'DISMISS_FAILURE' }),
      idleReset: () => dispatch({ type: 'IDLE_RESET' }),
    }),
    [refreshStatus, handleError],
  );

  const submit = useCallback(() => {
    // Evita doble envío: un segundo toque antes del re-render encuentra pendingRef ocupado.
    if (state.phase !== 'review' || pendingRef.current) return;
    const pending = {
      ballotId: newBallotId(),
      electionId: state.ballot.election.id,
      selections: state.selections,
    };
    pendingRef.current = pending;
    pendingBallot.set(pending);
    dispatch({ type: 'SUBMIT_START' });
  }, [state.phase, state.ballot, state.selections]);

  const value = useMemo(() => ({ state, ...actions, submit }), [state, actions, submit]);
  return <KioskContext.Provider value={value}>{children}</KioskContext.Provider>;
}

export function useKiosk() {
  const ctx = useContext(KioskContext);
  if (!ctx) throw new Error('useKiosk debe usarse dentro de KioskProvider');
  return ctx;
}
