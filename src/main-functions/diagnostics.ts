import { AppSettings } from '../types';
import { MatchSettings } from '../zodSchemas';
import { LogEntry, MatchEventEntry } from './logger';

// Assembles the one-click support bundle: a single human-readable text file
// the operator can attach to a GitHub issue. Deliberately plain text/Markdown
// rather than a zip, so it needs no extra dependency and is easy to paste
// straight into an issue body.
//
// This module is pure (no Electron, no filesystem): it only turns already-
// gathered, already-sanitized data into a string. The Electron-facing glue
// (gathering process.versions/os info, reading the live status functions,
// and the actual dialog.showSaveDialog + fs.writeFileSync) lives in main.ts,
// the only place that already has all of that state in scope.

export interface DiagnosticsVersions {
  app: string;
  electron: string;
  chrome: string;
  node: string;
}

export interface DiagnosticsOsInfo {
  platform: string;
  arch: string;
  release: string;
}

export interface DiagnosticsBrowserSourceStatus {
  running: boolean;
  port: number;
  error?: string;
}

// Deliberately NOT the full RemoteControlStatus type: there is no field here
// for the pairing PIN at all, so a caller can't leak it into a report just by
// spreading the wrong object. sanitizeRemoteControlStatus below is the only
// supported way to produce one of these from live status.
export interface DiagnosticsRemoteControlStatus {
  running: boolean;
  port: number;
  url: string;
  connectedCount: number;
  error?: string;
}

// The shape of the live remote-control status this module accepts as input
// to sanitizeRemoteControlStatus, i.e. RemoteControlStatus from types.ts
// (which does carry the PIN). Declared structurally here (rather than
// importing RemoteControlStatus) so this module needs no dependency beyond
// the fields it actually reads.
export interface RemoteControlStatusWithPin {
  running: boolean;
  port: number;
  pin: string;
  url: string;
  connectedCount: number;
  error?: string;
}

// The only sanctioned way to turn a live (PIN-carrying) remote-control
// status into the diagnostics-safe shape. Fields are picked one at a time
// rather than spread, so a field added to RemoteControlStatus in the future
// can never leak into a diagnostics bundle just by omission here; only what
// is explicitly listed below is ever copied across. This is the one function
// standing between the live PIN and the exported file.
export function sanitizeRemoteControlStatus(
  status: RemoteControlStatusWithPin
): DiagnosticsRemoteControlStatus {
  return {
    running: status.running,
    port: status.port,
    url: status.url,
    connectedCount: status.connectedCount,
    error: status.error,
  };
}

export interface DiagnosticsInput {
  generatedAt: string; // ISO 8601
  versions: DiagnosticsVersions;
  os: DiagnosticsOsInfo;
  // Sanitized through appSettingsSchema/matchSetingsSchema by the caller
  // (main.ts), same schemas used everywhere else settings cross a trust
  // boundary. Neither type carries a PIN or a token; the phone-remote PIN is
  // never persisted into AppSettings at all (see main.ts's remoteControlPin).
  appSettings: AppSettings;
  matchSettings: MatchSettings;
  browserSourceStatus: DiagnosticsBrowserSourceStatus;
  remoteControlStatus: DiagnosticsRemoteControlStatus;
  recentLog: LogEntry[];
  recentMatchEvents: MatchEventEntry[];
  recentFailedOperations: LogEntry[];
}

// Most-recent lines shown last (so a reader scrolls to the bottom for "what
// just happened", matching how a terminal tail reads) and capped so a long
// session's full ring buffer doesn't balloon the file past what's comfortable
// to paste into a GitHub issue.
export const MAX_LOG_LINES_IN_REPORT = 200;

function formatLine(entry: LogEntry): string {
  return `${entry.timestamp} [${entry.level}] ${entry.message}`;
}

function formatMatchEventLine(entry: MatchEventEntry): string {
  return `${entry.timestamp} ${entry.action} (${entry.source})`;
}

// Pure: builds the whole report from already-gathered, already-sanitized
// input. No Electron API, no filesystem, so it's fully unit-testable by
// feeding it fixed input and asserting on the returned string.
export function buildDiagnosticsReport(input: DiagnosticsInput): string {
  const lines: string[] = [];

  lines.push('# PlayOverlay diagnostics');
  lines.push('');
  lines.push(`Generated: ${input.generatedAt}`);
  lines.push('');
  lines.push(
    'This file is safe to share: it contains no passwords, PINs, or other secrets.'
  );
  lines.push('');

  lines.push('## Versions');
  lines.push(`- PlayOverlay: ${input.versions.app}`);
  lines.push(`- Electron: ${input.versions.electron}`);
  lines.push(`- Chrome: ${input.versions.chrome}`);
  lines.push(`- Node: ${input.versions.node}`);
  lines.push('');

  lines.push('## Operating system');
  lines.push(`- Platform: ${input.os.platform}`);
  lines.push(`- Architecture: ${input.os.arch}`);
  lines.push(`- Release: ${input.os.release}`);
  lines.push('');

  lines.push('## Browser source (OBS)');
  lines.push(`- Running: ${input.browserSourceStatus.running}`);
  lines.push(`- Port: ${input.browserSourceStatus.port}`);
  if (input.browserSourceStatus.error) {
    lines.push(`- Error: ${input.browserSourceStatus.error}`);
  }
  lines.push('');

  lines.push('## Phone remote');
  lines.push(`- Running: ${input.remoteControlStatus.running}`);
  lines.push(`- Port: ${input.remoteControlStatus.port}`);
  lines.push(`- URL: ${input.remoteControlStatus.url}`);
  lines.push(`- Connected phones: ${input.remoteControlStatus.connectedCount}`);
  if (input.remoteControlStatus.error) {
    lines.push(`- Error: ${input.remoteControlStatus.error}`);
  }
  lines.push('');

  lines.push('## App settings');
  lines.push('```json');
  lines.push(JSON.stringify(input.appSettings, null, 2));
  lines.push('```');
  lines.push('');

  lines.push('## Match settings');
  lines.push('```json');
  lines.push(JSON.stringify(input.matchSettings, null, 2));
  lines.push('```');
  lines.push('');

  lines.push('## Recent operator actions');
  if (input.recentMatchEvents.length === 0) {
    lines.push('(none recorded this session)');
  } else {
    input.recentMatchEvents.forEach((entry) =>
      lines.push(`- ${formatMatchEventLine(entry)}`)
    );
  }
  lines.push('');

  lines.push('## Recent failed operations');
  if (input.recentFailedOperations.length === 0) {
    lines.push('(none recorded this session)');
  } else {
    input.recentFailedOperations.forEach((entry) =>
      lines.push(`- ${formatLine(entry)}`)
    );
  }
  lines.push('');

  const tail = input.recentLog.slice(-MAX_LOG_LINES_IN_REPORT);
  lines.push(
    `## Recent log (last ${tail.length} of ${input.recentLog.length} buffered entries)`
  );
  lines.push('```');
  if (tail.length === 0) {
    lines.push('(empty)');
  } else {
    tail.forEach((entry) => lines.push(formatLine(entry)));
  }
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

// A stable, sortable, filesystem-safe default file name for the save dialog,
// e.g. playoverlay-diagnostics-2026-07-20T12-34-56-789Z.txt.
export function suggestedDiagnosticsFileName(now: Date): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  return `playoverlay-diagnostics-${stamp}.txt`;
}

// The result surfaced back to the renderer: either the user cancelled the
// save dialog, the file was written to `path`, or assembly/writing failed
// with `error`. Never carries the report content itself, only where (or
// whether) it landed on disk.
export type ExportDiagnosticsResult =
  | { cancelled: true }
  | { cancelled: false; path: string }
  | { cancelled: false; error: string };
