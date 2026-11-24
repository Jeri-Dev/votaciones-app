// Exportación CSV de resultados. Incluye BOM UTF-8 para que Excel muestre bien las tildes.
import { seatLabel } from './seats.js';

export function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows) {
  return '﻿' + rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
}

export function resultsToRows(results) {
  const rows = [['Elección', 'Directiva', 'Votación', 'Candidato', 'Votos', 'Porcentaje', 'Cargo obtenido']];
  for (const cat of results.categories || []) {
    for (const pos of cat.positions) {
      for (const c of pos.candidates) {
        const seat = seatLabel(pos, c.id);
        rows.push([results.election.name, cat.name, pos.name, c.name, c.votes, `${c.pct}%`, seat ? seat.text : '']);
      }
    }
  }
  rows.push(['Papeletas válidas', results.ballots, '', '', '', '', '']);
  return rows;
}

export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
