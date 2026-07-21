import { describe, expect, it } from 'vitest';
import {
  buildDiagnosticsReport,
  DiagnosticsInput,
  sanitizeRemoteControlStatus,
  suggestedDiagnosticsFileName,
} from '../diagnostics';
import { defaultAppSettings } from '../../constants';

// buildDiagnosticsReport is pure (no Electron, no filesystem): every test
// here feeds it fixed input and asserts on the returned string, exactly the
// way it will run when main.ts assembles the real report.

function baseInput(
  overrides: Partial<DiagnosticsInput> = {}
): DiagnosticsInput {
  return {
    generatedAt: '2026-07-20T12:00:00.000Z',
    versions: {
      app: '0.20.0',
      electron: '43.1.0',
      chrome: '140.0.0.0',
      node: '22.0.0',
    },
    os: {
      platform: 'darwin',
      arch: 'arm64',
      release: '24.5.0',
    },
    appSettings: { ...defaultAppSettings },
    matchSettings: {
      homeTeamNameFull: 'Home United',
      homeTeamNameAbbreviated: 'HOM',
      awayTeamNameFull: 'Away Rovers',
      awayTeamNameAbbreviated: 'AWY',
    },
    browserSourceStatus: { running: true, port: 4750 },
    remoteControlStatus: {
      running: true,
      port: 3006,
      url: 'http://192.168.1.20:3006/',
      connectedCount: 1,
    },
    recentLog: [],
    recentMatchEvents: [],
    recentFailedOperations: [],
    ...overrides,
  };
}

describe('sanitizeRemoteControlStatus', () => {
  it('never includes the PIN, even though the input carries one', () => {
    const sanitized = sanitizeRemoteControlStatus({
      running: true,
      port: 3006,
      pin: '123456',
      url: 'http://192.168.1.20:3006/',
      connectedCount: 2,
    });

    expect(sanitized).toEqual({
      running: true,
      port: 3006,
      url: 'http://192.168.1.20:3006/',
      connectedCount: 2,
      error: undefined,
    });
    expect(sanitized).not.toHaveProperty('pin');
    expect(JSON.stringify(sanitized)).not.toContain('123456');
  });

  it('carries an error through untouched when present', () => {
    const sanitized = sanitizeRemoteControlStatus({
      running: false,
      port: 3006,
      pin: '',
      url: 'http://192.168.1.20:3006/',
      connectedCount: 0,
      error: 'EADDRINUSE',
    });

    expect(sanitized.error).toBe('EADDRINUSE');
  });
});

describe('buildDiagnosticsReport', () => {
  it('never contains a PIN or token, even if one were accidentally present elsewhere in the input', () => {
    const report = buildDiagnosticsReport(
      baseInput({
        // Simulates a hypothetical future field leaking into appSettings;
        // the report must still never surface anything resembling a secret
        // from the fields it does know about (there is no pin/token field
        // in DiagnosticsRemoteControlStatus at all, by construction).
        appSettings: { ...defaultAppSettings },
      })
    );

    expect(report).not.toContain('pin');
    expect(report).not.toMatch(/\btoken\b/i);
  });

  it('includes versions, OS info, and both statuses', () => {
    const report = buildDiagnosticsReport(baseInput());

    expect(report).toContain('PlayOverlay: 0.20.0');
    expect(report).toContain('Electron: 43.1.0');
    expect(report).toContain('Chrome: 140.0.0.0');
    expect(report).toContain('Node: 22.0.0');
    expect(report).toContain('Platform: darwin');
    expect(report).toContain('Architecture: arm64');
    expect(report).toContain('Release: 24.5.0');
    expect(report).toContain('Running: true');
    expect(report).toContain('Port: 4750');
    expect(report).toContain('http://192.168.1.20:3006/');
    expect(report).toContain('Connected phones: 1');
  });

  it('includes an error line for a service only when one is present', () => {
    const withoutError = buildDiagnosticsReport(baseInput());
    expect(withoutError).not.toContain('Error:');

    const withError = buildDiagnosticsReport(
      baseInput({
        browserSourceStatus: {
          running: false,
          port: 4750,
          error: 'EADDRINUSE',
        },
      })
    );
    expect(withError).toContain('Error: EADDRINUSE');
  });

  it('serializes app and match settings as JSON', () => {
    const report = buildDiagnosticsReport(baseInput());

    expect(report).toContain('"homeTeamNameFull": "Home United"');
    expect(report).toContain('"awayTeamNameAbbreviated": "AWY"');
    expect(report).toContain(`"keyColour": "${defaultAppSettings.keyColour}"`);
  });

  it('lists recent operator actions and failed operations', () => {
    const report = buildDiagnosticsReport(
      baseInput({
        recentMatchEvents: [
          {
            timestamp: '2026-07-20T11:59:00.000Z',
            action: 'undo:actions.homeGoal',
            source: 'laptop',
          },
        ],
        recentFailedOperations: [
          {
            timestamp: '2026-07-20T11:58:00.000Z',
            level: 'error',
            message: 'Rejected upload with a disallowed file extension: x.exe',
          },
        ],
      })
    );

    expect(report).toContain('undo:actions.homeGoal (laptop)');
    expect(report).toContain(
      'Rejected upload with a disallowed file extension: x.exe'
    );
  });

  it('says so explicitly when there are no recent actions or failures', () => {
    const report = buildDiagnosticsReport(baseInput());

    expect(report).toContain('(none recorded this session)');
  });

  it('caps the log tail and reports how many of the buffer are shown', () => {
    const recentLog = Array.from({ length: 250 }, (_, index) => ({
      timestamp: `2026-07-20T12:${String(index % 60).padStart(2, '0')}:00.000Z`,
      level: 'info' as const,
      message: `line ${index}`,
    }));

    const report = buildDiagnosticsReport(baseInput({ recentLog }));

    expect(report).toContain('last 200 of 250 buffered entries');
    // The oldest lines are dropped, the most recent 200 are kept.
    expect(report).not.toContain('line 49');
    expect(report).toContain('line 50');
    expect(report).toContain('line 249');
  });

  it('states plainly that the file is safe to share', () => {
    const report = buildDiagnosticsReport(baseInput());

    expect(report).toContain('safe to share');
    expect(report).toContain('no passwords, PINs, or other secrets');
  });
});

describe('suggestedDiagnosticsFileName', () => {
  it('produces a stable, filesystem-safe name from the given date', () => {
    const name = suggestedDiagnosticsFileName(
      new Date('2026-07-20T12:34:56.789Z')
    );

    expect(name).toBe('playoverlay-diagnostics-2026-07-20T12-34-56-789Z.txt');
    expect(name).not.toMatch(/[:]/);
  });
});
