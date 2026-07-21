// The "Go live check" (preflight) evaluator. This is the one non-technical
// operator's pre-kickoff safety net: a single button that answers "am I
// ready?" and specifically catches the classic mistakes (output on the wrong
// screen, a missing team logo, a keyboard shortcut that silently lost its
// registration to another app) before the match starts, rather than
// mid-match.
//
// This module is deliberately Electron-free and filesystem-free: it takes an
// already-gathered PreflightSignals object and returns a plain list of check
// results. All the Electron/fs-touching work (which screen a window is on,
// whether a server is running, whether a file exists) happens in main.ts and
// is handed in as already-resolved data, so the decision logic here is fully
// unit-testable without a running Electron process. It is also read-only by
// construction: nothing in this file (or its caller) writes to disk, moves a
// window, or changes match state, it only looks and reports.

export type PreflightStatus = 'ok' | 'warning' | 'error';

// One row of the checklist. titleKey/detailKey are i18next keys (not baked
// English strings) so the UI can render them in the operator's chosen
// language; detailData carries whatever the detail key needs to interpolate
// (a count, a port number, a joined list of names). Every value in
// detailData is a plain string/number/boolean, never a translated fragment,
// the renderer is the only place that owns actual UI copy.
export interface PreflightCheckResult {
  id: string;
  status: PreflightStatus;
  titleKey: string;
  detailKey: string;
  detailData?: Record<string, string | number | boolean>;
}

export interface PreflightSummary {
  status: PreflightStatus;
  errorCount: number;
  warningCount: number;
}

export interface PreflightResult {
  checks: PreflightCheckResult[];
  summary: PreflightSummary;
}

export interface PreflightDisplaySignals {
  screenCount: number;
  // The screen id the control (dashboard) window is currently on, or null if
  // that can't be determined (e.g. the window doesn't exist yet).
  controlWindowScreenId: number | null;
  // Same, for the on-air output window.
  displayWindowScreenId: number | null;
}

// Shared shape for the two optional network features (OBS browser source,
// phone remote): both are off by default, and both can be "on but broken"
// (a busy port, a bind failure), which is the one case worth an error rather
// than a warning, since the operator will believe the feature is live when
// it silently isn't.
export interface PreflightServiceSignals {
  enabled: boolean;
  running: boolean;
  port: number;
  error?: string;
}

export interface PreflightSignals {
  displays: PreflightDisplaySignals;
  // Whether the output window currently exists, and whether it has
  // completed the display-ready handshake (requested and received its
  // initial state). A window that exists but never signalled ready is
  // still showing nothing useful.
  displayWindowExists: boolean;
  displayWindowReady: boolean;
  browserSource: PreflightServiceSignals;
  remoteControl: PreflightServiceSignals;
  // Structured, not pre-joined into a sentence: the renderer decides how to
  // phrase "home team logo" (translatable UI copy) versus a custom screen's
  // title (operator-authored free text, never translated, same convention
  // as team names elsewhere in the app).
  missingAssets: {
    homeTeamLogoMissing: boolean;
    awayTeamLogoMissing: boolean;
    // Titles of custom screens/overlays whose backing file is gone. Operator
    // authored text, passed through as-is.
    missingScreenTitles: string[];
  };
  // Accelerators (e.g. "CommandOrControl+G") that failed to register this
  // session, most likely because another app already claimed them. Not
  // natural language, so it's safe to join directly rather than via the
  // renderer.
  failedShortcuts: string[];
  // Bytes free on the volume backing userData, or null when it couldn't be
  // determined (statfs unsupported on this platform/Node version, or the
  // call itself failed). A null signal must never be treated as "low disk".
  freeDiskBytes: number | null;
  diskWarningThresholdBytes: number;
  // A live-match snapshot from a previous session that the operator hasn't
  // resolved yet (see main.ts's liveMatchResolved). Purely informational:
  // it's neither good nor bad, just worth surfacing before kickoff so it
  // isn't overlooked.
  hasUnresolvedLiveMatch: boolean;
}

// 500 MB: comfortably more than a long match's worth of log/config writes
// (see logger.ts's 1 MB rotation cap), but a level a nearly-full disk can
// realistically cross without the operator noticing.
export const DEFAULT_DISK_WARNING_THRESHOLD_BYTES = 500 * 1024 * 1024;

// Pure: given the paths PlayOverlay stores for the two team logos and an
// injected file-existence check (mirrors reconcileCustomScreens' own
// `fileExists` parameter so both stay independently unit-testable without
// touching a real filesystem), reports which side (if either) is missing its
// backing file. A logo that was never set (undefined/null path) is not a
// problem, there's nothing to check.
export function findMissingTeamLogos(
  logoPaths: { home?: string | null; away?: string | null },
  fileExists: (filePath: string) => boolean
): { homeMissing: boolean; awayMissing: boolean } {
  return {
    homeMissing: Boolean(logoPaths.home) && !fileExists(logoPaths.home!),
    awayMissing: Boolean(logoPaths.away) && !fileExists(logoPaths.away!),
  };
}

function evaluateDisplays(
  displays: PreflightDisplaySignals
): PreflightCheckResult {
  const id = 'displays';
  const titleKey = 'preflight:checks.displays.title';

  if (displays.screenCount <= 1) {
    return {
      id,
      status: 'warning',
      titleKey,
      detailKey: 'preflight:checks.displays.singleScreen',
    };
  }

  if (
    displays.controlWindowScreenId !== null &&
    displays.displayWindowScreenId !== null &&
    displays.controlWindowScreenId === displays.displayWindowScreenId
  ) {
    return {
      id,
      status: 'warning',
      titleKey,
      detailKey: 'preflight:checks.displays.sameScreen',
    };
  }

  return {
    id,
    status: 'ok',
    titleKey,
    detailKey: 'preflight:checks.displays.separated',
  };
}

function evaluateDisplayWindow(
  displayWindowExists: boolean,
  displayWindowReady: boolean
): PreflightCheckResult {
  const id = 'displayWindowReady';
  const titleKey = 'preflight:checks.displayWindowReady.title';

  if (displayWindowExists && displayWindowReady) {
    return {
      id,
      status: 'ok',
      titleKey,
      detailKey: 'preflight:checks.displayWindowReady.ready',
    };
  }

  return {
    id,
    status: 'error',
    titleKey,
    detailKey: 'preflight:checks.displayWindowReady.notReady',
  };
}

// Shared by the OBS browser source and phone remote checks: both are
// "off is fine", "on and running is fine", "on but not actually running is
// the one case worth flagging as an error" (the operator believes it's live
// when it silently isn't).
function evaluateService(
  id: 'browserSource' | 'remoteControl',
  service: PreflightServiceSignals
): PreflightCheckResult {
  const titleKey = `preflight:checks.${id}.title`;

  if (!service.enabled) {
    return {
      id,
      status: 'ok',
      titleKey,
      detailKey: `preflight:checks.${id}.off`,
    };
  }

  if (service.running && !service.error) {
    return {
      id,
      status: 'ok',
      titleKey,
      detailKey: `preflight:checks.${id}.running`,
      detailData: { port: service.port },
    };
  }

  return {
    id,
    status: 'error',
    titleKey,
    detailKey: `preflight:checks.${id}.failed`,
    detailData: { error: service.error ?? '' },
  };
}

function evaluateMissingAssets(
  missingAssets: PreflightSignals['missingAssets']
): PreflightCheckResult {
  const id = 'missingAssets';
  const titleKey = 'preflight:checks.missingAssets.title';
  const count =
    (missingAssets.homeTeamLogoMissing ? 1 : 0) +
    (missingAssets.awayTeamLogoMissing ? 1 : 0) +
    missingAssets.missingScreenTitles.length;

  if (count === 0) {
    return {
      id,
      status: 'ok',
      titleKey,
      detailKey: 'preflight:checks.missingAssets.ok',
    };
  }

  return {
    id,
    status: 'warning',
    titleKey,
    detailKey: 'preflight:checks.missingAssets.missing',
    detailData: {
      count,
      homeTeamLogoMissing: missingAssets.homeTeamLogoMissing,
      awayTeamLogoMissing: missingAssets.awayTeamLogoMissing,
      // Joined here (not left as an array) since detailData must stay
      // interpolation-friendly primitives; screen/overlay titles are
      // operator-authored text so joining them plainly is safe, unlike the
      // team-logo labels the renderer must still translate itself.
      screenTitles: missingAssets.missingScreenTitles.join(', '),
    },
  };
}

function evaluateShortcuts(failedShortcuts: string[]): PreflightCheckResult {
  const id = 'shortcuts';
  const titleKey = 'preflight:checks.shortcuts.title';

  if (failedShortcuts.length === 0) {
    return {
      id,
      status: 'ok',
      titleKey,
      detailKey: 'preflight:checks.shortcuts.ok',
    };
  }

  return {
    id,
    status: 'warning',
    titleKey,
    detailKey: 'preflight:checks.shortcuts.failed',
    detailData: {
      count: failedShortcuts.length,
      accelerators: failedShortcuts.join(', '),
    },
  };
}

function evaluateDiskSpace(
  freeDiskBytes: number | null,
  thresholdBytes: number
): PreflightCheckResult {
  const id = 'diskSpace';
  const titleKey = 'preflight:checks.diskSpace.title';

  if (freeDiskBytes === null) {
    return {
      id,
      status: 'ok',
      titleKey,
      detailKey: 'preflight:checks.diskSpace.unknown',
    };
  }

  if (freeDiskBytes < thresholdBytes) {
    return {
      id,
      status: 'warning',
      titleKey,
      detailKey: 'preflight:checks.diskSpace.low',
      detailData: { freeMb: Math.round(freeDiskBytes / (1024 * 1024)) },
    };
  }

  return {
    id,
    status: 'ok',
    titleKey,
    detailKey: 'preflight:checks.diskSpace.ok',
  };
}

function evaluateCrashRecovery(
  hasUnresolvedLiveMatch: boolean
): PreflightCheckResult {
  const id = 'crashRecovery';
  const titleKey = 'preflight:checks.crashRecovery.title';

  return {
    id,
    // Always 'ok': this is a note, not a problem, per the spec, an
    // unresolved snapshot from last time is expected behaviour (crash
    // recovery working as intended), not something to warn about.
    status: 'ok',
    titleKey,
    detailKey: hasUnresolvedLiveMatch
      ? 'preflight:checks.crashRecovery.found'
      : 'preflight:checks.crashRecovery.none',
  };
}

function summarize(checks: PreflightCheckResult[]): PreflightSummary {
  const errorCount = checks.filter((check) => check.status === 'error').length;
  const warningCount = checks.filter(
    (check) => check.status === 'warning'
  ).length;

  const status: PreflightStatus =
    errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'ok';

  return { status, errorCount, warningCount };
}

// The single entry point: given every raw signal, returns the full ordered
// checklist plus an overall summary. Order matches the spec's list (screens,
// output window, the two optional network features, assets, shortcuts, disk,
// crash recovery) so the UI never has to re-sort it.
export function evaluatePreflightChecks(
  signals: PreflightSignals
): PreflightResult {
  const checks: PreflightCheckResult[] = [
    evaluateDisplays(signals.displays),
    evaluateDisplayWindow(
      signals.displayWindowExists,
      signals.displayWindowReady
    ),
    evaluateService('browserSource', signals.browserSource),
    evaluateService('remoteControl', signals.remoteControl),
    evaluateMissingAssets(signals.missingAssets),
    evaluateShortcuts(signals.failedShortcuts),
    evaluateDiskSpace(signals.freeDiskBytes, signals.diskWarningThresholdBytes),
    evaluateCrashRecovery(signals.hasUnresolvedLiveMatch),
  ];

  return { checks, summary: summarize(checks) };
}
