import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REMOTE_CONTROL_PAGE, REMOTE_WATCHDOG_MS } from '../remoteControlPage';

// Drives the phone page's inline script in the test's jsdom window against a
// scripted fake WebSocket, so the pairing, reconnect, and control-state logic
// can be exercised without a browser or a real server.

type Frame = Record<string, unknown>;

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  sent: Frame[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.closed = true;
    this.readyState = FakeWebSocket.CLOSED;
  }

  // Test-side helpers standing in for the server.
  serverOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  serverSend(message: Frame) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  serverClose() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }
}

const RUNNING_STATE = {
  scores: { homeTeam: 1, awayTeam: 0 },
  time: { time: '12:34', paused: false, matchPhase: 'firstHalf' },
  matchState: { displayScreen: 'scoreBug', matchPhase: 'firstHalf' },
  matchSettings: {
    homeTeamNameAbbreviated: 'HOM',
    awayTeamNameAbbreviated: 'AWA',
    homeTeamNameFull: 'Home Team',
    awayTeamNameFull: 'Away Team',
  },
};

const PAGE_BODY = REMOTE_CONTROL_PAGE.slice(
  REMOTE_CONTROL_PAGE.indexOf('<body>') + '<body>'.length,
  REMOTE_CONTROL_PAGE.indexOf('<script>')
);
const PAGE_SCRIPT = REMOTE_CONTROL_PAGE.slice(
  REMOTE_CONTROL_PAGE.indexOf('<script>') + '<script>'.length,
  REMOTE_CONTROL_PAGE.indexOf('</script>')
);

// Document-level listeners the page script adds, removed after each test so
// one test's page instance can't react to the next test's events.
let documentListeners: [string, EventListenerOrEventListenerObject][] = [];

function loadPage(): void {
  document.body.innerHTML = PAGE_BODY;
  const addEventListener = document.addEventListener.bind(document);
  vi.spyOn(document, 'addEventListener').mockImplementation(
    (type: string, listener: EventListenerOrEventListenerObject) => {
      documentListeners.push([type, listener]);
      addEventListener(type, listener);
    }
  );
  // Runs the inline script exactly as the browser would, in this window.
  new Function(PAGE_SCRIPT)();
}

function socket(index = FakeWebSocket.instances.length - 1): FakeWebSocket {
  return FakeWebSocket.instances[index];
}

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function pressKeys(keys: string): void {
  for (const key of keys) {
    document.querySelector<HTMLButtonElement>(`[data-key="${key}"]`)!.click();
  }
}

function pairFrames(ws: FakeWebSocket): Frame[] {
  return ws.sent.filter((frame) => frame.type === 'pair');
}

function commandButtons(): HTMLButtonElement[] {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>('#controlView button')
  );
}

// Loads the page, opens its socket, and pairs with the PIN.
function loadAndPair(token = 'token-1'): FakeWebSocket {
  loadPage();
  const ws = socket();
  ws.serverOpen();
  pressKeys('123456');
  ws.serverSend({ type: 'paired', token });
  return ws;
}

describe('remote control page', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    window.sessionStorage.clear();
  });

  afterEach(() => {
    for (const [type, listener] of documentListeners) {
      document.removeEventListener(type, listener);
    }
    documentListeners = [];
    vi.clearAllTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('pairing', () => {
    it('clears a rejected PIN so the next keypress does not resend it', () => {
      loadPage();
      const ws = socket();
      ws.serverOpen();

      pressKeys('000000');
      expect(pairFrames(ws)).toEqual([{ type: 'pair', pin: '000000' }]);

      ws.serverSend({ type: 'unauthorized', reason: 'wrongPin' });
      expect($('pinDisplay').textContent).toBe('');
      expect($('pairError').textContent).toContain('Wrong PIN');

      // One digit is just the start of a new PIN, not another attempt.
      pressKeys('1');
      expect(pairFrames(ws)).toHaveLength(1);
      expect($('pinDisplay').textContent).toBe('•');
    });

    it('counts down a cooldown with the keypad locked, then unlocks it', () => {
      loadPage();
      const ws = socket();
      ws.serverOpen();
      pressKeys('000000');

      ws.serverSend({
        type: 'unauthorized',
        reason: 'cooldown',
        retryAfterSeconds: 30,
      });
      expect($('pinDisplay').textContent).toBe('');
      expect($('pairError').textContent).toContain(
        'Too many attempts. Wait 30 seconds'
      );
      const keys = document.querySelectorAll<HTMLButtonElement>('.pad button');
      expect(Array.from(keys).every((key) => key.disabled)).toBe(true);

      pressKeys('123456');
      expect(pairFrames(ws)).toHaveLength(1);

      // The server keeps heartbeating meanwhile, so the socket stays up.
      for (let i = 0; i < 29; i += 1) {
        vi.advanceTimersByTime(1000);
        ws.serverSend({ type: 'heartbeat' });
      }
      expect($('pairError').textContent).toContain('Wait 1 second,');

      vi.advanceTimersByTime(1000);
      expect(Array.from(keys).every((key) => !key.disabled)).toBe(true);
      pressKeys('123456');
      expect(pairFrames(ws)).toHaveLength(2);
    });
  });

  describe('resume', () => {
    it('stores the resume token and presents it (never the PIN) on reconnect', () => {
      const first = loadAndPair('token-abc');
      first.serverSend({ type: 'state', payload: RUNNING_STATE });
      expect(
        window.sessionStorage.getItem('playoverlayRemoteResumeToken')
      ).toBe('token-abc');

      first.serverClose();
      vi.advanceTimersByTime(1000);
      const second = socket();
      expect(second).not.toBe(first);
      second.serverOpen();

      expect(second.sent).toEqual([{ type: 'resume', token: 'token-abc' }]);
      // Stays on the controls while resuming.
      expect($('controlView').classList.contains('hidden')).toBe(false);
    });

    it('drops to the PIN screen with an explanation when the token is stale', () => {
      const first = loadAndPair('old-token');
      first.serverSend({ type: 'state', payload: RUNNING_STATE });
      first.serverClose();
      vi.advanceTimersByTime(1000);
      const second = socket();
      second.serverOpen();

      second.serverSend({ type: 'unauthorized', reason: 'resumeRejected' });
      expect($('pairView').classList.contains('hidden')).toBe(false);
      expect($('controlView').classList.contains('hidden')).toBe(true);
      expect($('pairError').textContent).toContain('new PIN');
      expect(
        window.sessionStorage.getItem('playoverlayRemoteResumeToken')
      ).toBeNull();
      expect(pairFrames(second)).toHaveLength(0);
    });

    it('resumes straight away after a page reload with a saved token', () => {
      window.sessionStorage.setItem('playoverlayRemoteResumeToken', 'saved');
      loadPage();
      expect($('controlView').classList.contains('hidden')).toBe(false);
      expect(commandButtons().every((button) => button.disabled)).toBe(true);

      socket().serverOpen();
      expect(socket().sent).toEqual([{ type: 'resume', token: 'saved' }]);
    });
  });

  describe('controls', () => {
    it('stay disabled after pairing until the first snapshot arrives', () => {
      const ws = loadAndPair();
      expect(commandButtons().every((button) => button.disabled)).toBe(true);
      $('toggleClock').click();
      document
        .querySelector<HTMLButtonElement>('[data-cmd="homeGoal"]')!
        .click();
      expect(ws.sent.filter((frame) => frame.type !== 'pair')).toEqual([]);

      ws.serverSend({ type: 'state', payload: RUNNING_STATE });
      expect($('statusText').textContent).toBe('Connected');
      document
        .querySelector<HTMLButtonElement>('[data-cmd="homeGoal"]')!
        .click();
      expect(ws.sent).toContainEqual({ type: 'homeGoal' });
    });

    it('labels the clock button Pause or Resume and disables it with no phase running', () => {
      const ws = loadAndPair();
      const toggle = $('toggleClock') as HTMLButtonElement;

      ws.serverSend({
        type: 'state',
        payload: { ...RUNNING_STATE, time: { time: '00:00' } },
      });
      expect(toggle.disabled).toBe(true);
      // Next phase remains the way to kick off.
      expect(
        document.querySelector<HTMLButtonElement>('[data-cmd="nextPhase"]')!
          .disabled
      ).toBe(false);

      ws.serverSend({ type: 'state', payload: RUNNING_STATE });
      expect(toggle.disabled).toBe(false);
      expect(toggle.textContent).toBe('Pause');

      ws.serverSend({
        type: 'state',
        payload: {
          ...RUNNING_STATE,
          time: { ...RUNNING_STATE.time, paused: true },
        },
      });
      expect(toggle.disabled).toBe(false);
      expect(toggle.textContent).toBe('Resume');

      toggle.click();
      expect(ws.sent).toContainEqual({ type: 'toggleClock' });
    });
  });

  describe('liveness watchdog', () => {
    it('keeps a socket that receives heartbeats', () => {
      const ws = loadAndPair();
      ws.serverSend({ type: 'state', payload: RUNNING_STATE });
      for (let i = 0; i < 10; i += 1) {
        vi.advanceTimersByTime(REMOTE_WATCHDOG_MS - 1000);
        ws.serverSend({ type: 'heartbeat' });
      }
      expect(FakeWebSocket.instances).toHaveLength(1);
      expect($('statusText').textContent).toBe('Connected');
    });

    it('abandons a silent socket and reconnects immediately, with controls disabled', () => {
      const ws = loadAndPair();
      ws.serverSend({ type: 'state', payload: RUNNING_STATE });

      vi.advanceTimersByTime(REMOTE_WATCHDOG_MS);

      // Detached before closing, so its late close can't double-reconnect.
      expect(ws.closed).toBe(true);
      expect(ws.onclose).toBeNull();
      expect(ws.onmessage).toBeNull();
      // No backoff wait: the replacement socket already exists.
      expect(FakeWebSocket.instances).toHaveLength(2);
      expect($('statusText').textContent).not.toBe('Connected');
      expect(commandButtons().every((button) => button.disabled)).toBe(true);

      socket().serverOpen();
      expect(socket().sent).toEqual([{ type: 'resume', token: 'token-1' }]);
    });
  });
});
