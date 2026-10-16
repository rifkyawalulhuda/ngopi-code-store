import {
  describePortInUse,
  parseFirstPid,
  parseWindowsNetstat,
  PortInUseError,
} from './preflight';

describe('preflight', () => {
  describe('parseWindowsNetstat', () => {
    it('extracts the PID of the LISTENING socket for the port', () => {
      const output = [
        '',
        'Active Connections',
        '',
        '  Proto  Local Address          Foreign Address        State           PID',
        '  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       12345',
        '  TCP    [::]:3000              [::]:0                 LISTENING       12345',
        '  TCP    127.0.0.1:5432         0.0.0.0:0              LISTENING       6789',
        '',
      ].join('\r\n');

      expect(parseWindowsNetstat(output, 3000)).toBe(12345);
      expect(parseWindowsNetstat(output, 5432)).toBe(6789);
    });

    it('does not confuse a port with a longer port sharing the prefix', () => {
      const output = '  TCP    0.0.0.0:30000          0.0.0.0:0              LISTENING       999';
      expect(parseWindowsNetstat(output, 3000)).toBeNull();
    });

    it('ignores non-LISTENING sockets (established/time-wait)', () => {
      const output = [
        '  TCP    127.0.0.1:3000         127.0.0.1:52000        ESTABLISHED     111',
        '  TCP    127.0.0.1:3000         127.0.0.1:52001        TIME_WAIT       0',
      ].join('\r\n');
      expect(parseWindowsNetstat(output, 3000)).toBeNull();
    });

    it('returns null when the port is not present', () => {
      const output = '  TCP    0.0.0.0:3001           0.0.0.0:0              LISTENING       1';
      expect(parseWindowsNetstat(output, 3000)).toBeNull();
    });

    it('returns null for empty output', () => {
      expect(parseWindowsNetstat('', 3000)).toBeNull();
    });

    it('handles an IPv6-only listener', () => {
      const output = '  TCP    [::1]:3000             [::]:0                 LISTENING       4242';
      expect(parseWindowsNetstat(output, 3000)).toBe(4242);
    });
  });

  describe('parseFirstPid', () => {
    it('returns the first numeric line', () => {
      expect(parseFirstPid('4242\n4243\n')).toBe(4242);
    });

    it('skips blank lines', () => {
      expect(parseFirstPid('\n\n  777  \n')).toBe(777);
    });

    it('returns null when there is no pid', () => {
      expect(parseFirstPid('')).toBeNull();
      expect(parseFirstPid('command not found')).toBeNull();
    });
  });

  describe('describePortInUse', () => {
    it('includes the port and a kill command when the PID is known', () => {
      const message = describePortInUse(new PortInUseError(3000, 12345));
      expect(message).toContain('3000');
      expect(message).toContain('12345');
      expect(message).toMatch(/taskkill|kill /);
    });

    it('still explains how to investigate when the PID is unknown', () => {
      const message = describePortInUse(new PortInUseError(3000, null));
      expect(message).toContain('3000');
      expect(message).toMatch(/netstat|lsof/);
    });

    it('suggests running on a different port', () => {
      const message = describePortInUse(new PortInUseError(3000, null));
      expect(message).toContain('PORT=3001');
    });
  });
});
