import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DISK_WARNING_THRESHOLD_BYTES,
  evaluatePreflightChecks,
  findMissingTeamLogos,
  PreflightSignals,
} from '../preflight';

// evaluatePreflightChecks is pure (no Electron, no filesystem): every test
// here feeds it a fixed signals object and asserts on the returned checklist,
// exactly the way it will run once main.ts has finished gathering the real
// signals.

function baseSignals(
  overrides: Partial<PreflightSignals> = {}
): PreflightSignals {
  return {
    displays: {
      screenCount: 2,
      controlWindowScreenId: 1,
      displayWindowScreenId: 2,
    },
    displayWindowExists: true,
    displayWindowReady: true,
    browserSource: { enabled: false, running: false, port: 4750 },
    remoteControl: { enabled: false, running: false, port: 3006 },
    missingAssets: {
      homeTeamLogoMissing: false,
      awayTeamLogoMissing: false,
      missingScreenTitles: [],
    },
    failedShortcuts: [],
    freeDiskBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    diskWarningThresholdBytes: DEFAULT_DISK_WARNING_THRESHOLD_BYTES,
    hasUnresolvedLiveMatch: false,
    ...overrides,
  };
}

function checkFor(
  result: ReturnType<typeof evaluatePreflightChecks>,
  id: string
) {
  const check = result.checks.find((c) => c.id === id);
  if (!check) throw new Error(`No check with id ${id}`);
  return check;
}

describe('evaluatePreflightChecks', () => {
  it('is all clear when every signal is healthy', () => {
    const result = evaluatePreflightChecks(baseSignals());

    expect(result.checks.every((check) => check.status === 'ok')).toBe(true);
    expect(result.summary).toEqual({
      status: 'ok',
      errorCount: 0,
      warningCount: 0,
    });
  });

  it('warns when only one screen is detected', () => {
    const result = evaluatePreflightChecks(
      baseSignals({
        displays: {
          screenCount: 1,
          controlWindowScreenId: 1,
          displayWindowScreenId: 1,
        },
      })
    );

    const check = checkFor(result, 'displays');
    expect(check.status).toBe('warning');
    expect(check.detailKey).toBe('preflight:checks.displays.singleScreen');
    expect(result.summary.status).toBe('warning');
  });

  it('warns when the output window shares a screen with the control window', () => {
    const result = evaluatePreflightChecks(
      baseSignals({
        displays: {
          screenCount: 2,
          controlWindowScreenId: 1,
          displayWindowScreenId: 1,
        },
      })
    );

    const check = checkFor(result, 'displays');
    expect(check.status).toBe('warning');
    expect(check.detailKey).toBe('preflight:checks.displays.sameScreen');
  });

  it('errors when the output window does not exist or has not signalled ready', () => {
    const result = evaluatePreflightChecks(
      baseSignals({ displayWindowExists: false, displayWindowReady: false })
    );

    const check = checkFor(result, 'displayWindowReady');
    expect(check.status).toBe('error');
    expect(result.summary.status).toBe('error');
  });

  it('errors when the browser source is enabled but not running (enabled-but-failed)', () => {
    const result = evaluatePreflightChecks(
      baseSignals({
        browserSource: {
          enabled: true,
          running: false,
          port: 4750,
          error: 'EADDRINUSE',
        },
      })
    );

    const check = checkFor(result, 'browserSource');
    expect(check.status).toBe('error');
    expect(check.detailKey).toBe('preflight:checks.browserSource.failed');
    expect(check.detailData).toEqual({ error: 'EADDRINUSE' });
    expect(result.summary.status).toBe('error');
  });

  it('is ok when the browser source is off (skipped, informational)', () => {
    const result = evaluatePreflightChecks(
      baseSignals({
        browserSource: { enabled: false, running: false, port: 4750 },
      })
    );

    const check = checkFor(result, 'browserSource');
    expect(check.status).toBe('ok');
    expect(check.detailKey).toBe('preflight:checks.browserSource.off');
  });

  it('is ok when the browser source is enabled and running', () => {
    const result = evaluatePreflightChecks(
      baseSignals({
        browserSource: { enabled: true, running: true, port: 4750 },
      })
    );

    const check = checkFor(result, 'browserSource');
    expect(check.status).toBe('ok');
    expect(check.detailData).toEqual({ port: 4750 });
  });

  it('errors when the phone remote is enabled but not running', () => {
    const result = evaluatePreflightChecks(
      baseSignals({
        remoteControl: {
          enabled: true,
          running: false,
          port: 3006,
          error: 'Bind failed',
        },
      })
    );

    const check = checkFor(result, 'remoteControl');
    expect(check.status).toBe('error');
  });

  it('warns with a count when assets are missing', () => {
    const result = evaluatePreflightChecks(
      baseSignals({
        missingAssets: {
          homeTeamLogoMissing: true,
          awayTeamLogoMissing: false,
          missingScreenTitles: ['Sponsor Board'],
        },
      })
    );

    const check = checkFor(result, 'missingAssets');
    expect(check.status).toBe('warning');
    expect(check.detailData).toEqual({
      count: 2,
      homeTeamLogoMissing: true,
      awayTeamLogoMissing: false,
      screenTitles: 'Sponsor Board',
    });
  });

  it('is ok when no assets are missing', () => {
    const result = evaluatePreflightChecks(baseSignals());
    const check = checkFor(result, 'missingAssets');
    expect(check.status).toBe('ok');
  });

  it('warns with the list of accelerators when a shortcut failed to register', () => {
    const result = evaluatePreflightChecks(
      baseSignals({ failedShortcuts: ['CommandOrControl+G'] })
    );

    const check = checkFor(result, 'shortcuts');
    expect(check.status).toBe('warning');
    expect(check.detailData).toEqual({
      count: 1,
      accelerators: 'CommandOrControl+G',
    });
  });

  it('warns when free disk space is below the threshold', () => {
    const result = evaluatePreflightChecks(
      baseSignals({ freeDiskBytes: 100 * 1024 * 1024 }) // 100 MB
    );

    const check = checkFor(result, 'diskSpace');
    expect(check.status).toBe('warning');
    expect(check.detailData).toEqual({ freeMb: 100 });
  });

  it('is ok, not warning, when disk space could not be determined at all', () => {
    const result = evaluatePreflightChecks(
      baseSignals({ freeDiskBytes: null })
    );

    const check = checkFor(result, 'diskSpace');
    expect(check.status).toBe('ok');
    expect(check.detailKey).toBe('preflight:checks.diskSpace.unknown');
  });

  it('notes an unresolved crash-recovery snapshot without treating it as a problem', () => {
    const result = evaluatePreflightChecks(
      baseSignals({ hasUnresolvedLiveMatch: true })
    );

    const check = checkFor(result, 'crashRecovery');
    expect(check.status).toBe('ok');
    expect(check.detailKey).toBe('preflight:checks.crashRecovery.found');
    // A snapshot note alone must never flip the overall summary to a warning.
    expect(result.summary.status).toBe('ok');
  });

  it('notes there is nothing to restore when no snapshot exists', () => {
    const result = evaluatePreflightChecks(baseSignals());
    const check = checkFor(result, 'crashRecovery');
    expect(check.detailKey).toBe('preflight:checks.crashRecovery.none');
  });

  it('summarizes multiple problems: an error takes priority over warnings in overall status', () => {
    const result = evaluatePreflightChecks(
      baseSignals({
        displays: {
          screenCount: 1,
          controlWindowScreenId: 1,
          displayWindowScreenId: 1,
        },
        browserSource: {
          enabled: true,
          running: false,
          port: 4750,
          error: 'boom',
        },
      })
    );

    expect(result.summary).toEqual({
      status: 'error',
      errorCount: 1,
      warningCount: 1,
    });
  });
});

describe('findMissingTeamLogos', () => {
  it('reports neither side missing when both logos exist', () => {
    const result = findMissingTeamLogos(
      { home: '/images/home.png', away: '/images/away.png' },
      () => true
    );

    expect(result).toEqual({ homeMissing: false, awayMissing: false });
  });

  it('reports only the side whose backing file is gone', () => {
    const fileExists = (filePath: string) => filePath === '/images/home.png';

    const result = findMissingTeamLogos(
      { home: '/images/home.png', away: '/images/away.png' },
      fileExists
    );

    expect(result).toEqual({ homeMissing: false, awayMissing: true });
  });

  it('treats an unset logo as not missing, there is nothing to check', () => {
    const fileExists = () => false;

    const result = findMissingTeamLogos(
      { home: undefined, away: null },
      fileExists
    );

    expect(result).toEqual({ homeMissing: false, awayMissing: false });
  });
});
