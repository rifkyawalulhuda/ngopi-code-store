#!/usr/bin/env node
'use strict';

/**
 * Exit diagnostic preload.
 *
 *   npm run diagnose
 *
 * Loads this file into the server process (via NODE_OPTIONS=--require) and
 * records *how* the process ended. It exists because a process can end in ways
 * that leave no trace at all:
 *
 *   - `process.exit()`        → an `exit` event fires, and --trace-exit shows a stack
 *   - event loop drained      → `beforeExit` fires first
 *   - killed by the OS        → NEITHER fires; the process simply vanishes
 *
 * The last case is the confusing one: no stack trace, no error, an empty stderr,
 * and a server that "booted fine then died on its own". Only an external
 * TerminateProcess (taskkill /F, Task Manager, a job object closing, security
 * software) produces that signature.
 *
 * After the server dies, read the log:
 *
 *   %TEMP%\ngopi-exit.log        (Windows)
 *   $TMPDIR/ngopi-exit.log       (macOS / Linux)
 *
 * How to read it:
 *   - `beforeExit` then `exit`  → the event loop emptied (nothing kept it alive)
 *   - `exit code=N` with no beforeExit → an explicit process.exit(N)
 *   - `SIGTERM` / `SIGINT` received    → an ordinary stop request
 *   - heartbeats stop with NO final event → killed externally (see below)
 *
 * If it was killed externally, check, in order:
 *   1. Another `npm run dev` / `dev.bat` competing for the same port.
 *   2. Security software quarantine/kill history.
 *   3. A supervisor script, IDE task, or container that reaps the process.
 *   4. Windows: Event Viewer → Windows Logs → Application / System.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const logFile = path.join(os.tmpdir(), 'ngopi-exit.log');
const startedAt = Date.now();

function log(msg) {
  const line = `${new Date().toISOString()} [pid ${process.pid}] ${msg}\n`;
  try {
    fs.appendFileSync(logFile, line);
  } catch {
    /* logging must never break the app */
  }
  // Also mirror to stderr so it shows up in the normal terminal output.
  process.stderr.write(`[diagnose] ${msg}\n`);
}

function activeHandles() {
  try {
    return process._getActiveHandles().map((h) => h.constructor.name).join(',') || '(none)';
  } catch {
    return 'unavailable';
  }
}

log(`=== diagnostic preload loaded (uptime 0s) ===`);

process.on('beforeExit', (code) => {
  log(`beforeExit code=${code} activeHandles=[${activeHandles()}] — event loop drained`);
});

process.on('exit', (code) => {
  const secs = Math.round((Date.now() - startedAt) / 1000);
  log(`exit code=${code} after ${secs}s`);
});

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
  process.on(signal, () => log(`${signal} received after ${Math.round((Date.now() - startedAt) / 1000)}s`));
}

process.on('uncaughtException', (err) => log(`uncaughtException ${err && err.stack}`));
process.on('unhandledRejection', (reason) => log(`unhandledRejection ${reason && (reason.stack || reason)}`));

// Heartbeat proves the process was still alive up to this point. If the log
// stops here with no beforeExit/exit/signal line, the kill came from outside.
// unref'd so the timer never keeps the process alive on its own.
setInterval(() => {
  log(`heartbeat rss=${Math.round(process.memoryUsage().rss / 1048576)}MB handles=${activeHandles()}`);
}, 15_000).unref();
