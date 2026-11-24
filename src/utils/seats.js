// Cargos obtenidos en una votación que reparte varios puestos por orden de votos
// (p. ej. 1.º Presidente, 2.º Vicepresidente). Los calcula el servidor en `position.seats`.

/** Cargo que obtiene un candidato: { text, tie } o null. */
export function seatLabel(position, candidateId) {
  const held = (position.seats || []).filter((s) => s.candidateIds.includes(candidateId));
  if (!held.length) return null;
  const roles = held.map((s) => s.role).join(' / ');
  const tie = held.some((s) => s.tie);
  return { text: tie ? `Empate: ${roles}` : roles, tie };
}

/** Texto de ayuda para el votante: "El más votado será Presidente y el segundo, Vicepresidente." */
export function rolesHint(roles) {
  if (!roles || roles.length < 2) return '';
  return `El más votado será ${roles[0]} y el segundo, ${roles[1]}.`;
}

/**
 * Nombres por cargo para resúmenes: [{ role, names, tie, merged }].
 * Si el mismo grupo empata por los dos cargos (p. ej. A y B con 2 votos cada uno), se une en
 * una sola entrada "Presidente / Vicepresidente" para no repetir los nombres.
 */
export function seatSummary(position) {
  const out = [];
  for (const s of position.seats || []) {
    const prev = out[out.length - 1];
    const same = prev && prev.ids.length === s.candidateIds.length && prev.ids.every((id) => s.candidateIds.includes(id));
    if (prev && s.tie && prev.tie && same) {
      prev.role = `${prev.role} / ${s.role}`;
      prev.merged = true;
      continue;
    }
    out.push({
      role: s.role,
      tie: s.tie,
      merged: false,
      ids: s.candidateIds,
      names: s.candidateIds.map((id) => position.candidates.find((c) => c.id === id)?.name).filter(Boolean),
    });
  }
  return out;
}
