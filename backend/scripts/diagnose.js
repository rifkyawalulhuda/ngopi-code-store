#!/usr/bin/env node
'use strict';

/**
 * Runs the dev server with the exit diagnostic preload attached.
 *
 *   npm run diagnose
 *
 * Use this when the backend keeps stopping on its own. It starts the normal
 * `npm run dev` (so the port preflight still applies) with
 * NODE_OPTIONS=--require pointing at `diagnose-exit.js`, which records how the
 * process ended.
 *
 * A launcher is used instead of an inline `NODE_OPTIONS=... npm run dev` because
 * that syntax differs between cmd.exe and POSIX shells; setting it in the child
 * environment here works everywhere without an extra dependency.
 */

const { spawn } = require('child_process');
const path = require('path');

const preload = path.join(__dirname, 'diagnose-exit.js');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

console.log('--- diagnose mode ---');
console.log('preload :', preload);
console.log('log     :', path.join(require('os').tmpdir(), 'ngopi-exit.log'));
console.log('Starting server. Let it run until it stops, then read the log above.');
console.log('--------------------\n');

// Node >= 18.20 / 20.12 / 22 refuses to spawn .cmd/.bat without a shell
// (CVE-2024-27980 mitigation) and throws EINVAL on Windows, so `npm.cmd` needs
// `shell: true`. The command is passed as a single string rather than an args
// array to avoid DEP0190 (un-escaped args with shell: true).
const useShell = process.platform === 'win32';
const command = useShell ? `${npm} run dev` : npm;

const child = spawn(command, useShell ? [] : ['run', 'dev'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: `--require ${preload}` },
  shell: useShell,
});

child.on('exit', (code, signal) => {
  console.log('\n--- diagnose mode: server exited ---');
  console.log(`code=${code} signal=${signal}`);
  if (signal) {
    // A signal here means an orderly stop request (SIGINT/SIGTERM), which the
    // preload also logs explicitly.
    console.log(`The process was terminated by signal ${signal}.`);
  }
  console.log('Read the log for the exact reason (beforeExit / exit / signal / silence).');
  process.exit(code === null ? 1 : code);
});

child.on('error', (err) => {
  console.error('Failed to start the server:', err.message);
  process.exit(1);
});
