import fs from 'fs';
import path from 'path';

// Durable logging for the main process. Before this, console.error/warn went
// nowhere durable: nothing survived a restart, and the app's one
// non-technical user (who can't attach a debugger or read a terminal) had no
// way to hand over what actually happened. This module writes a
// size-capped, rotating text log to `<userData>/logs/main.log` and keeps a
// few small in-memory ring buffers for fast diagnostics export.
//
// The pure pieces (the rotation decision, the line formatter, the ring
// buffer itself) take no Electron API and touch no filesystem, so they're
// unit-testable in isolation. The Logger class is the only part that touches
// fs, and even it never throws out of a logging call: a logging failure must
// never be the thing that crashes or interrupts the app.

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string; // ISO 8601, e.g. 2026-07-20T12:34:56.789Z
  level: LogLevel;
  message: string;
}

// An operator-action event from the undo choke point (see store/undo.ts).
// Kept distinct from LogEntry: it carries the i18n label key and input
// source rather than a free-text message, so a diagnostics export can list
// "what the operator did" without re-parsing log lines.
export interface MatchEventEntry {
  timestamp: string;
  action: string;
  source: string;
}

// Rotation cap. Once the file would exceed this many bytes, it's rotated to
// `main.log.1` (overwriting any previous rotated file) and a fresh file is
// started, so the log can never grow unbounded over a long match or a long
// app lifetime. 1 MB is comfortably enough for many matches' worth of
// lifecycle/error lines (this is not a per-frame log, see logMatchEvent and
// the call sites that route through this module) while never becoming
// unreasonable to attach to a GitHub issue.
export const MAX_LOG_FILE_BYTES = 1024 * 1024; // 1 MB

// Ring buffer capacities. Generous enough to cover a full match's worth of
// activity for the diagnostics export, small enough to cost nothing kept in
// memory for the app's lifetime.
export const LOG_RING_BUFFER_CAPACITY = 500;
export const MATCH_EVENT_RING_BUFFER_CAPACITY = 200;
export const FAILED_OPERATION_RING_BUFFER_CAPACITY = 50;

// Pure: would appending `incomingBytes` more to a file already
// `currentSizeBytes` long cross `maxBytes`? Extracted from the Logger class
// so the rotation policy itself is testable without touching a real file.
export function shouldRotate(
  currentSizeBytes: number,
  incomingBytes: number,
  maxBytes: number = MAX_LOG_FILE_BYTES
): boolean {
  return currentSizeBytes + incomingBytes > maxBytes;
}

// Pure: one human-readable, grep-friendly line per entry, e.g.
// "2026-07-20T12:34:56.789Z [error] Failed to start browser source server: ...".
export function formatLogLine(entry: LogEntry): string {
  return `${entry.timestamp} [${entry.level}] ${entry.message}`;
}

// The durable log is a file the operator exports and hands to someone else
// (a GitHub issue, a support request), so a raw filesystem path must never
// land in it verbatim: on most platforms it contains the user's home
// directory, and therefore their OS username. This reduces a path or file
// name to just its base name (path.basename drops every directory
// component), strips control characters (which have no legitimate place in a
// file name and could otherwise corrupt a plain-text log line or a terminal
// tailing it), and caps the length so a pathologically long name can't bloat
// a log line. Pure and exported so every call site that logs a path-shaped
// value shares this one redaction.
const MAX_SANITIZED_LOG_PATH_LENGTH = 200;

export function sanitizeLogPath(input: string): string {
  const baseName = path.basename(input);
  // Deliberately matching C0 control characters (and DEL) to strip them.
  // eslint-disable-next-line no-control-regex
  const withoutControlCharacters = baseName.replace(/[\x00-\x1f\x7f]/g, '');
  return withoutControlCharacters.slice(0, MAX_SANITIZED_LOG_PATH_LENGTH);
}

// A fixed-capacity FIFO, oldest entries dropped first once `capacity` is
// exceeded. Pure and framework-free so it's directly unit-testable; Logger
// below owns three instances of it (the log tail, match events, and failed
// operations) for fast diagnostics export without re-reading main.log.
export class RingBuffer<T> {
  private readonly capacity: number;
  private entries: T[] = [];

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  push(entry: T): void {
    this.entries.push(entry);
    if (this.entries.length > this.capacity) {
      this.entries = this.entries.slice(this.entries.length - this.capacity);
    }
  }

  toArray(): T[] {
    return [...this.entries];
  }
}

export interface LoggerOptions {
  // Directory the log file(s) live in. When omitted, the Logger keeps
  // everything in memory (ring buffers still work, console output still
  // happens) but never touches disk. Used as the safe default before
  // initLogger() runs, e.g. under vitest, so importing this module never
  // touches the real filesystem unless a test explicitly asks it to.
  logDir?: string;
  maxFileBytes?: number;
}

export class Logger {
  private readonly logFilePath: string | null;
  private readonly rotatedFilePath: string | null;
  private readonly maxFileBytes: number;
  private readonly ring = new RingBuffer<LogEntry>(LOG_RING_BUFFER_CAPACITY);
  private readonly matchEvents = new RingBuffer<MatchEventEntry>(
    MATCH_EVENT_RING_BUFFER_CAPACITY
  );
  private readonly failedOperations = new RingBuffer<LogEntry>(
    FAILED_OPERATION_RING_BUFFER_CAPACITY
  );

  constructor(options: LoggerOptions = {}) {
    this.maxFileBytes = options.maxFileBytes ?? MAX_LOG_FILE_BYTES;

    if (options.logDir) {
      this.logFilePath = path.join(options.logDir, 'main.log');
      this.rotatedFilePath = path.join(options.logDir, 'main.log.1');
      try {
        fs.mkdirSync(options.logDir, { recursive: true });
      } catch {
        // If the log directory can't be created, appendLine's own try/catch
        // below silently no-ops on every write; the in-memory ring buffers
        // (and console output) keep working regardless.
      }
    } else {
      this.logFilePath = null;
      this.rotatedFilePath = null;
    }
  }

  private rotate(): void {
    if (!this.logFilePath || !this.rotatedFilePath) return;
    try {
      fs.rmSync(this.rotatedFilePath, { force: true });
      if (fs.existsSync(this.logFilePath)) {
        fs.renameSync(this.logFilePath, this.rotatedFilePath);
      }
    } catch {
      // Best effort: worst case the file keeps growing past the cap until a
      // later rotation succeeds. Never throw out of a logging call.
    }
  }

  private appendLine(entry: LogEntry): void {
    if (!this.logFilePath || !this.rotatedFilePath) return;
    const line = `${formatLogLine(entry)}\n`;
    try {
      let currentSize = 0;
      try {
        currentSize = fs.statSync(this.logFilePath).size;
      } catch {
        currentSize = 0; // File doesn't exist yet, nothing to rotate.
      }
      if (
        shouldRotate(currentSize, Buffer.byteLength(line), this.maxFileBytes)
      ) {
        this.rotate();
      }
      fs.appendFileSync(this.logFilePath, line);
    } catch {
      // A logging failure must never crash (or even interrupt) the caller;
      // there is nowhere left to report it once the durable log itself is
      // unwritable.
    }
  }

  private record(level: LogLevel, message: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    this.ring.push(entry);
    this.appendLine(entry);
  }

  info(message: string): void {
    console.log(message);
    this.record('info', message);
  }

  warn(message: string): void {
    console.warn(message);
    this.record('warn', message);
  }

  error(message: string): void {
    console.error(message);
    this.record('error', message);
  }

  // A failed operation (a rejected upload, a browser-source bind error, an
  // IPC handler failure...) is always also an error-level log line, but it's
  // additionally kept in its own bounded bucket so diagnostics can show
  // "recent failures" without scanning the whole log tail for [error] lines.
  logFailedOperation(message: string): void {
    console.error(message);
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
    };
    this.ring.push(entry);
    this.failedOperations.push(entry);
    this.appendLine(entry);
  }

  // An operator-action event from the undo choke point. Lightweight by
  // design: actions are infrequent (a goal, a phase change), never a
  // per-frame state update, so this is safe to call on every captureUndo.
  logMatchEvent(action: string, source: string): void {
    const timestamp = new Date().toISOString();
    this.matchEvents.push({ timestamp, action, source });
    // Also lands in the main text log (tagged distinctly from info/warn/
    // error) so a plain `tail -f main.log` shows match events inline with
    // everything else.
    this.appendLine({
      timestamp,
      level: 'info',
      message: `match-event: ${action} (${source})`,
    });
  }

  getRecentEntries(): LogEntry[] {
    return this.ring.toArray();
  }

  getRecentMatchEvents(): MatchEventEntry[] {
    return this.matchEvents.toArray();
  }

  getRecentFailedOperations(): LogEntry[] {
    return this.failedOperations.toArray();
  }

  // Absorbs another Logger's buffered entries into this one, oldest first.
  // Used once, by initLogger below, so entries recorded by the memory-only
  // fallback logger before the real (userData-backed) logger existed, e.g.
  // storage.ts's createStorage running at module load, aren't lost once
  // logging is initialised: they stay visible through getRecentEntries/
  // getRecentMatchEvents/getRecentFailedOperations and therefore the
  // diagnostics export. Entries are pushed straight into this logger's ring
  // buffers (and, for the general tail, appended to its log file) rather than
  // re-logged through info/warn/error, so they aren't printed to console a
  // second time.
  absorb(previous: Logger): void {
    previous.getRecentEntries().forEach((entry) => {
      this.ring.push(entry);
      this.appendLine(entry);
    });
    previous.getRecentMatchEvents().forEach((entry) => {
      this.matchEvents.push(entry);
    });
    previous.getRecentFailedOperations().forEach((entry) => {
      this.failedOperations.push(entry);
    });
  }
}

// Module-level singleton. initLogger() is called once, early, from main.ts
// with the real userData path. Until then, getLogger() falls back to a
// memory-only instance (see the `logDir` comment on LoggerOptions above), so
// every other main-process module can import and call logInfo/logWarn/
// logError/etc. unconditionally without needing to know whether logging has
// been initialised yet.
let activeLogger: Logger | null = null;
let fallbackLogger: Logger | null = null;

export function initLogger(userDataPath: string): Logger {
  const logger = new Logger({ logDir: path.join(userDataPath, 'logs') });
  // Carry over anything the pre-init fallback logger already buffered (see
  // getLogger below) so it isn't lost the moment the durable logger takes
  // over.
  if (fallbackLogger) {
    logger.absorb(fallbackLogger);
  }
  activeLogger = logger;
  return activeLogger;
}

export function getLogger(): Logger {
  if (activeLogger) return activeLogger;
  if (!fallbackLogger) {
    fallbackLogger = new Logger();
  }
  return fallbackLogger;
}

// Resets the singleton so tests can observe a clean fallback logger. Not
// used by production code.
export function resetLoggerForTests(): void {
  activeLogger = null;
  fallbackLogger = null;
}

export function logInfo(message: string): void {
  getLogger().info(message);
}

export function logWarn(message: string): void {
  getLogger().warn(message);
}

export function logError(message: string): void {
  getLogger().error(message);
}

export function logFailedOperation(message: string): void {
  getLogger().logFailedOperation(message);
}

export function logMatchEvent(action: string, source: string): void {
  getLogger().logMatchEvent(action, source);
}
