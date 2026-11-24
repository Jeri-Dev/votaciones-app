// Helpers de la papeleta en el cliente. El servidor vuelve a validar todo.

export function ballotProgress(categories, selections) {
  const byCategory = {};
  const missing = [];
  let total = 0;
  let done = 0;
  for (const cat of categories) {
    byCategory[cat.id] = { total: cat.positions.length, done: 0 };
    for (const pos of cat.positions) {
      total += 1;
      const chosen = selections[pos.id];
      if (chosen && pos.candidates.some((c) => c.id === chosen)) {
        done += 1;
        byCategory[cat.id].done += 1;
      } else {
        missing.push(pos.id);
      }
    }
  }
  return { total, done, missing, byCategory, complete: total > 0 && missing.length === 0 };
}

export function findCandidate(categories, positionId, candidateId) {
  for (const cat of categories) {
    for (const pos of cat.positions) {
      if (pos.id === positionId) return pos.candidates.find((c) => c.id === candidateId) || null;
    }
  }
  return null;
}

export function initials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}
