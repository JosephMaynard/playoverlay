import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requestStreamDecks = vi.hoisted(() => vi.fn());

vi.mock('@elgato-stream-deck/webhid', () => ({
  requestStreamDecks,
  VENDOR_ID: 0x0fd9,
  CORSAIR_VENDOR_ID: 0x1b1c,
}));

// Just enough of StreamDeckWeb for connectToStreamDeck. The buttons passed
// in below are empty and the fake has fewer keys than the "next set" index,
// so nothing is painted (jsdom has no canvas) and only the connection
// handling is exercised.
function fakeDeck(overrides: { clearPanel?: () => Promise<void> } = {}) {
  return {
    CONTROLS: [{ type: 'button' }, { type: 'button' }],
    clearPanel: vi.fn(overrides.clearPanel ?? (() => Promise.resolve())),
    close: vi.fn(() => Promise.resolve()),
    removeAllListeners: vi.fn(),
    on: vi.fn(),
    fillKeyCanvas: vi.fn(() => Promise.resolve()),
  };
}

let hid: EventTarget;

async function loadStreamDeck() {
  vi.resetModules();
  return import('../stream-deck');
}

describe('connectToStreamDeck', () => {
  beforeEach(() => {
    hid = new EventTarget();
    Object.defineProperty(navigator, 'hid', {
      configurable: true,
      value: hid,
    });
  });

  afterEach(() => {
    requestStreamDecks.mockReset();
    delete (navigator as { hid?: unknown }).hid;
  });

  it('reuses the connected device for later redraws', async () => {
    const deck = fakeDeck();
    requestStreamDecks.mockResolvedValue([deck]);
    const { connectToStreamDeck } = await loadStreamDeck();

    await connectToStreamDeck([], vi.fn());
    await connectToStreamDeck([], vi.fn());

    expect(requestStreamDecks).toHaveBeenCalledTimes(1);
    expect(deck.clearPanel).toHaveBeenCalledTimes(2);
  });

  it('forgets a device whose clear fails, so the next Connect requests a fresh one', async () => {
    const deadDeck = fakeDeck({
      clearPanel: () => Promise.reject(new Error('device gone')),
    });
    const freshDeck = fakeDeck();
    requestStreamDecks
      .mockResolvedValueOnce([deadDeck])
      .mockResolvedValueOnce([freshDeck]);
    const { connectToStreamDeck } = await loadStreamDeck();

    await expect(connectToStreamDeck([], vi.fn())).rejects.toThrow(
      'device gone'
    );
    expect(deadDeck.close).toHaveBeenCalled();

    await connectToStreamDeck([], vi.fn());
    expect(requestStreamDecks).toHaveBeenCalledTimes(2);
    expect(freshDeck.clearPanel).toHaveBeenCalled();
  });

  it('drops the device when WebHID reports a Stream Deck disconnect', async () => {
    const firstDeck = fakeDeck();
    const secondDeck = fakeDeck();
    requestStreamDecks
      .mockResolvedValueOnce([firstDeck])
      .mockResolvedValueOnce([secondDeck]);
    const { connectToStreamDeck } = await loadStreamDeck();

    await connectToStreamDeck([], vi.fn());

    // Another vendor's device leaving is ignored.
    hid.dispatchEvent(
      Object.assign(new Event('disconnect'), { device: { vendorId: 0x046d } })
    );
    await connectToStreamDeck([], vi.fn());
    expect(requestStreamDecks).toHaveBeenCalledTimes(1);

    hid.dispatchEvent(
      Object.assign(new Event('disconnect'), { device: { vendorId: 0x0fd9 } })
    );
    expect(firstDeck.close).toHaveBeenCalled();

    await connectToStreamDeck([], vi.fn());
    expect(requestStreamDecks).toHaveBeenCalledTimes(2);
    expect(secondDeck.clearPanel).toHaveBeenCalled();
  });
});
