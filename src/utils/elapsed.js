// Tiempo transcurrido de la votación para la pantalla de conteo público.

/**
 * Milisegundos desde que se abrió la votación. Si ya cerró, queda fijo en la duración total.
 * nowMs debe estar corregido con la hora del servidor (ver clockOffset).
 */
export function electionElapsedMs(election, nowMs) {
  if (!election?.opened_at) return 0;
  const start = new Date(election.opened_at).getTime();
  const end = election.status === 'CLOSED' && election.closed_at ? new Date(election.closed_at).getTime() : nowMs;
  return Math.max(0, end - start);
}

/** 3 723 000 ms → "01:02:03". */
export function formatDuration(ms) {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Diferencia entre el reloj del servidor y el del dispositivo (para no depender de la hora local). */
export function clockOffset(serverTimeIso, localNowMs = Date.now()) {
  return serverTimeIso ? new Date(serverTimeIso).getTime() - localNowMs : 0;
}
