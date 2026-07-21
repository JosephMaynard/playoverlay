import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatLogLine,
  Logger,
  MAX_LOG_FILE_BYTES,
  RingBuffer,
  shouldRotate,
} from '../logger';

// These tests are Electron-free throughout: Logger takes only a plain
// directory string, never an Electron API, so it's exercised here exactly
// the way it will run in the packaged app, just pointed at a temp directory
// instead of the real userData path.

describe('shouldRotate', () => {
  it('is false while the incoming write stays within the cap', () => {
    expect(shouldRotate(100, 50, 1000)).toBe(false);
    expect(shouldRotate(950, 50, 1000)).toBe(false);
  });

  it('is true once the incoming write would cross the cap', () => {
    expect(shouldRotate(950, 51, 1000)).toBe(true);
    expect(shouldRotate(1000, 1, 1000)).toBe(true);
  });

  it('defaults to MAX_LOG_FILE_BYTES when no cap is given', () => {
    expect(shouldRotate(MAX_LOG_FILE_BYTES - 1, 2)).toBe(true);
    expect(shouldRotate(0, MAX_LOG_FILE_BYTES - 1)).toBe(false);
  });
});

describe('formatLogLine', () => {
  it('formats a timestamp, level, and message onto one line', () => {
    const line = formatLogLine({
      timestamp: '2026-07-20T12:00:00.000Z',
      level: 'error',
      message: 'Something broke',
    });

    expect(line).toBe('2026-07-20T12:00:00.000Z [error] Something broke');
  });
});

describe('RingBuffer', () => {
  it('returns entries in insertion order while under capacity', () => {
    const buffer = new RingBuffer<number>(5);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);

    expect(buffer.toArray()).toEqual([1, 2, 3]);
  });

  it('drops the oldest entries once capacity is exceeded, keeping order', () => {
    const buffer = new RingBuffer<number>(3);
    [1, 2, 3, 4, 5].forEach((value) => buffer.push(value));

    expect(buffer.toArray()).toEqual([3, 4, 5]);
  });

  it('toArray returns a snapshot, not a live reference', () => {
    const buffer = new RingBuffer<number>(3);
    buffer.push(1);
    const snapshot = buffer.toArray();
    buffer.push(2);

    expect(snapshot).toEqual([1]);
    expect(buffer.toArray()).toEqual([1, 2]);
  });
});

describe('Logger', () => {
  const temporaryDirectories: string[] = [];

  function createTempLogDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'playoverlay-logger-'));
    temporaryDirectories.push(dir);
    return dir;
  }

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    temporaryDirectories.splice(0).forEach((dir) => {
      fs.rmSync(dir, { recursive: true, force: true });
    });
  });

  it('writes info/warn/error lines to main.log and still calls console', () => {
    const dir = createTempLogDir();
    const logger = new Logger({ logDir: dir });

    logger.info('starting up');
    logger.warn('a bit odd');
    logger.error('something failed');

    expect(console.log).toHaveBeenCalledWith('starting up');
    expect(console.warn).toHaveBeenCalledWith('a bit odd');
    expect(console.error).toHaveBeenCalledWith('something failed');

    const contents = fs.readFileSync(path.join(dir, 'main.log'), 'utf8');
    expect(contents).toContain('[info] starting up');
    expect(contents).toContain('[warn] a bit odd');
    expect(contents).toContain('[error] something failed');
  });

  it('keeps an in-memory tail of the most recent entries', () => {
    const dir = createTempLogDir();
    const logger = new Logger({ logDir: dir });

    logger.info('first');
    logger.error('second');

    const recent = logger.getRecentEntries();
    expect(recent).toHaveLength(2);
    expect(recent[0]).toMatchObject({ level: 'info', message: 'first' });
    expect(recent[1]).toMatchObject({ level: 'error', message: 'second' });
  });

  it('rotates main.log to main.log.1 once the size cap would be exceeded', () => {
    const dir = createTempLogDir();
    // A tiny cap makes rotation trivial to trigger deterministically: each
    // line here is well under 100 bytes, so a handful of writes is enough to
    // cross it at least once.
    const logger = new Logger({ logDir: dir, maxFileBytes: 100 });

    for (let i = 0; i < 20; i += 1) {
      logger.info(`line number ${i}`);
    }

    const mainLogPath = path.join(dir, 'main.log');
    const rotatedLogPath = path.join(dir, 'main.log.1');

    expect(fs.existsSync(rotatedLogPath)).toBe(true);
    // The active file never grows past the cap for long: it was rotated
    // away before the write that would have crossed it landed in a fresh
    // file, so it never accumulates unboundedly.
    expect(fs.statSync(mainLogPath).size).toBeLessThanOrEqual(100);
  });

  it('never throws when the log directory cannot be created or written to', () => {
    // A file (not a directory) at the target path makes mkdirSync fail
    // inside the constructor, and appendFileSync fail on every write.
    const parent = createTempLogDir();
    const blockedPath = path.join(parent, 'blocked-by-a-file');
    fs.writeFileSync(blockedPath, 'not a directory');

    const logger = new Logger({ logDir: blockedPath });

    expect(() => logger.error('should not throw')).not.toThrow();
    // Console output and the in-memory ring buffer still work regardless.
    expect(console.error).toHaveBeenCalledWith('should not throw');
    expect(logger.getRecentEntries()).toHaveLength(1);
  });

  it('is memory-only (never touches disk) when constructed with no logDir', () => {
    const logger = new Logger();

    logger.error('memory only');

    expect(console.error).toHaveBeenCalledWith('memory only');
    expect(logger.getRecentEntries()).toHaveLength(1);
  });

  it('tracks failed operations in their own bounded bucket, separate from the general tail', () => {
    const logger = new Logger();

    logger.info('all good');
    logger.logFailedOperation('the upload was rejected');

    expect(logger.getRecentFailedOperations()).toEqual([
      expect.objectContaining({ message: 'the upload was rejected' }),
    ]);
    // Also lands in the general tail as an ordinary error-level entry.
    expect(logger.getRecentEntries()).toEqual([
      expect.objectContaining({ level: 'info', message: 'all good' }),
      expect.objectContaining({
        level: 'error',
        message: 'the upload was rejected',
      }),
    ]);
  });

  it('records operator-action events distinctly from the log tail', () => {
    const logger = new Logger();

    logger.logMatchEvent('undo:actions.homeGoal', 'laptop');
    logger.logMatchEvent('undo:actions.nextPhase', 'streamDeck');

    expect(logger.getRecentMatchEvents()).toEqual([
      expect.objectContaining({
        action: 'undo:actions.homeGoal',
        source: 'laptop',
      }),
      expect.objectContaining({
        action: 'undo:actions.nextPhase',
        source: 'streamDeck',
      }),
    ]);
  });
});
