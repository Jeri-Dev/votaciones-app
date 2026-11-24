import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Apps Script (HtmlService) solo sirve un archivo HTML, así que todo el JS y CSS
// se incrusta en dist/index.html, que luego se copia a apps-script/Index.html.
// En Netlify el mismo dist/ se publica tal cual y habla con Apps Script vía VITE_GAS_URL.

if (process.env.NETLIFY === 'true') {
  const url = process.env.VITE_GAS_URL || '';
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) {
    throw new Error(
      'Falta VITE_GAS_URL (o es inválida). En Netlify → Site configuration → Environment variables, ' +
        'defina VITE_GAS_URL con la URL de la app web de Apps Script (https://script.google.com/macros/s/…/exec).',
    );
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  // Solo desarrollo: permite abrir `npm run dev` desde otro dispositivo por un túnel de Azure Dev Tunnels.
  server: {
    host: true,
    allowedHosts: ['.devtunnels.ms'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
