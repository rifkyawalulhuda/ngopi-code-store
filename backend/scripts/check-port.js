#!/usr/bin/env node
'use strict';

/**
 * Fast port preflight, run by the `dev` and `start` npm scripts BEFORE the app.
 *
 * Why it must be plain JavaScript and must run first:
 *   - plain `node` starts in ~0.07s
 *   - `ts-node` adds ~4s of compilation
 *   - importing `vendure-config` adds ~6s more (Vendure + NestJS + TypeORM + all plugins)
 *
 * Vendure only binds the port *after* that ~10s initialisation, so a conflict
 * used to appear as "Nest application successfully started" followed by
 * EADDRINUSE and a silent exit — indistinguishable from the server dying on its
 * own. Checking here reports it in well under a second.
 *
 * A second, richer guard lives in `src/preflight.ts` and runs inside the app
 * itself, covering entry points that bypass these npm scripts (e.g. invoking
 * `ts-node src/index.ts` or `node dist/index.js` directly).
 */

const net = require('net');

const port = Number.parseInt(process.env.PORT || '3010', 10);

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(`\nPORT tidak valid: "${process.env.PORT}"\n`);
  process.exit(1);
}

const probe = net.createServer();

probe.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      [
        '',
        '============================================================',
        `  PORT ${port} SUDAH DIPAKAI PROSES LAIN`,
        '============================================================',
        '',
        'Kemungkinan penyebab:',
        '  - `npm run dev` dijalankan dua kali (dua terminal/tab)',
        '  - dev.bat sudah menyalakan backend, lalu dijalankan lagi',
        '  - jendela terminal ditutup tanpa mematikan proses anaknya',
        '',
        'Cari prosesnya:',
        process.platform === 'win32'
          ? `  netstat -ano | findstr :${port}`
          : `  lsof -i :${port}`,
        '',
        'Hentikan beserta seluruh proses anaknya (Windows):',
        '  taskkill /PID <pid> /T /F',
        '',
        `Atau pakai port lain:  PORT=${port + 1} npm run dev`,
        '  (PowerShell:  $env:PORT=3001; npm run dev)',
        '============================================================',
        '',
      ].join('\n'),
    );
    process.exit(1);
  }

  console.error(`\nGagal memeriksa port ${port}: ${err.message}\n`);
  process.exit(1);
});

probe.once('listening', () => {
  // Release the port immediately so the real server can bind it.
  probe.close(() => process.exit(0));
});

probe.listen(port);
