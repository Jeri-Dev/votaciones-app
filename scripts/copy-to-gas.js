// Copia el build de un solo archivo (dist/index.html) a apps-script/Index.html,
// que es lo que sirve doGet() con HtmlService.createHtmlOutputFromFile('Index').
import { copyFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'dist', 'index.html');
const target = join(root, 'apps-script', 'Index.html');

if (!existsSync(source)) {
  console.error('No existe dist/index.html. Ejecute primero "npm run build".');
  process.exit(1);
}
copyFileSync(source, target);
const kb = (statSync(target).size / 1024).toFixed(0);
console.log(`apps-script/Index.html actualizado (${kb} KB). Siguiente paso: clasp push`);
