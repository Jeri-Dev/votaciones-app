// Genera los PNG de la PWA a partir de los SVG de public/icons (se ejecuta una sola vez,
// o cuando cambie el diseño del icono). Usa Playwright/Chromium para rasterizar:
//   node scripts/generate-icons.cjs <ruta-a-playwright> [ruta-a-chromium]
const path = require('path');
const fs = require('fs');

const playwrightPath = process.argv[2] || 'playwright';
const { chromium } = require(playwrightPath);
const ICONS = path.join(__dirname, '..', 'public', 'icons');

const OUTPUTS = [
  { src: 'icon.svg', out: 'icon-192.png', size: 192, transparent: true },
  { src: 'icon.svg', out: 'icon-512.png', size: 512, transparent: true },
  { src: 'icon-maskable.svg', out: 'icon-maskable-512.png', size: 512, transparent: false },
  { src: 'icon-maskable.svg', out: 'apple-touch-icon.png', size: 180, transparent: false },
];

(async () => {
  const browser = await chromium.launch(process.argv[3] ? { executablePath: process.argv[3] } : {});
  for (const o of OUTPUTS) {
    const svg = fs.readFileSync(path.join(ICONS, o.src), 'utf8');
    const page = await browser.newPage({ viewport: { width: o.size, height: o.size } });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${o.size}" height="${o.size}" `)}</body></html>`,
    );
    await page.screenshot({ path: path.join(ICONS, o.out), omitBackground: o.transparent });
    await page.close();
    console.log('✓', o.out);
  }
  await browser.close();
})();
