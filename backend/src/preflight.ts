import { execFileSync } from 'child_process';
import net from 'net';

/**
 * Startup preflight checks.
 *
 * The reason this exists: Vendure initialises for ~10 seconds (DB connection,
 * plugins, job queues) and only *then* binds the HTTP port. If the port is
 * already taken, the failure surfaces as
 *
 *     Nest application successfully started
 *     error  Error: listen EADDRINUSE: address already in use :::3000
 *
 * i.e. the server looks like it booted and then "died on its own", with no hint
 * that the real problem is a second copy already running. Checking the port up
 * front turns that into a sub-second, self-explanatory failure.
 */

/** Thrown when the configured port cannot be bound. */
export class PortInUseError extends Error {
  constructor(
    public readonly port: number,
    public readonly ownerPid: number | null = null,
  ) {
    super(`Port ${port} is already in use`);
    this.name = 'PortInUseError';
  }
}

/**
 * Verifies the port can be bound, by binding it and immediately releasing it.
 *
 * Binding (rather than merely connecting) is the only reliable probe: it
 * reproduces exactly what the HTTP server will do, so a successful probe
 * guarantees `bootstrap()` will not fail on `listen`.
 */
export async function assertPortAvailable(port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const probe = net.createServer();

    const onError = (err: NodeJS.ErrnoException): void => {
      probe.removeListener('listening', onListening);
      if (err.code === 'EADDRINUSE') {
        reject(new PortInUseError(port, findPortOwnerPid(port)));
      } else {
        reject(err);
      }
    };

    const onListening = (): void => {
      probe.removeListener('error', onError);
      // Release the port before continuing so the real server can take it.
      probe.close(() => resolve());
    };

    probe.once('error', onError);
    probe.once('listening', onListening);
    probe.listen(port);
  });
}

/**
 * Best-effort lookup of the PID listening on a port.
 *
 * Returns null when it cannot be determined (unknown platform, command missing,
 * or insufficient permissions) — the caller still reports the conflict, just
 * without a PID.
 */
export function findPortOwnerPid(port: number): number | null {
  try {
    if (process.platform === 'win32') {
      return parseWindowsNetstat(
        execFileSync('netstat', ['-ano'], { encoding: 'utf8', timeout: 5000 }),
        port,
      );
    }
    // macOS / Linux: lsof is the most portable; fall back to ss.
    try {
      const out = execFileSync('lsof', ['-ti', `:${port}`], {
        encoding: 'utf8',
        timeout: 5000,
      });
      return parseFirstPid(out);
    } catch {
      const out = execFileSync('ss', ['-lptnH', `sport = :${port}`], {
        encoding: 'utf8',
        timeout: 5000,
      });
      const match = out.match(/pid=(\d+)/);
      return match ? Number(match[1]) : null;
    }
  } catch {
    return null;
  }
}

/** Extracts the PID from `netstat -ano` output for a LISTENING socket. */
export function parseWindowsNetstat(output: string, port: number): number | null {
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.includes('LISTENING')) {
      continue;
    }
    const fields = line.split(/\s+/);
    if (fields.length < 5) {
      continue;
    }
    // fields: [proto, localAddress, foreignAddress, state, pid]
    const localAddress = fields[1];
    const portPart = localAddress.slice(localAddress.lastIndexOf(':') + 1);
    if (portPart !== String(port)) {
      continue;
    }
    const pid = Number(fields[fields.length - 1]);
    if (Number.isInteger(pid) && pid > 0) {
      return pid;
    }
  }
  return null;
}

/** Returns the first numeric line of lsof output. */
export function parseFirstPid(output: string): number | null {
  const first = output.split(/\r?\n/).map((l) => l.trim()).find((l) => /^\d+$/.test(l));
  return first ? Number(first) : null;
}

/**
 * Builds the operator-facing message for a port conflict, including the exact
 * command to free the port.
 */
export function describePortInUse(error: PortInUseError): string {
  const { port, ownerPid } = error;

  const lines = [
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
  ];

  if (ownerPid) {
    lines.push(
      `Proses yang memakai port ini: pid ${ownerPid}`,
      '',
      'Hentikan beserta seluruh proses anaknya:',
      process.platform === 'win32'
        ? `  taskkill /PID ${ownerPid} /T /F`
        : `  kill ${ownerPid}   # atau: kill -9 ${ownerPid}`,
      '',
      'Cek ulang:',
      process.platform === 'win32'
        ? `  netstat -ano | findstr :${port}`
        : `  lsof -i :${port}`,
    );
  } else {
    lines.push(
      'PID pemakai port tidak dapat dideteksi (perlu hak akses lebih tinggi).',
      '',
      'Cari manual:',
      process.platform === 'win32'
        ? `  netstat -ano | findstr :${port}`
        : `  lsof -i :${port}`,
      '',
      'Lalu hentikan pid tersebut (Windows: taskkill /PID <pid> /T /F).',
    );
  }

  lines.push(
    '',
    `Atau jalankan di port lain:  set PORT=3001 && npm run dev   (PowerShell: $env:PORT=3001)`,
    '============================================================',
    '',
  );

  return lines.join('\n');
}
