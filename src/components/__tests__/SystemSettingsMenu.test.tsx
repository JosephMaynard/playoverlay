import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultAppSettings,
  defaultMatchSettings,
  defaultMatchState,
} from '../../constants';
import { AppSettings } from '../../types';
import SystemSettingsMenu from '../SystemSettingsMenu/SystemSettingsMenu';

const connectToStreamDeck = vi.hoisted(() =>
  vi.fn<
    (buttons: Array<{ text: string }>, nextScreen: () => void) => Promise<void>
  >()
);

vi.mock('../../stream-deck', () => ({
  connectToStreamDeck,
  NEXT_SET_KEY_INDEX: 5,
}));

// The browser-source panel now lives in SystemSettingsMenu; it calls
// getBrowserSourceStatus on mount, same as AppSettingsMenu used to.
function installElectronAPI() {
  const electronAPI = {
    getVersion: vi.fn(() => '0.18.0-test'),
    getBrowserSourceStatus: vi
      .fn()
      .mockResolvedValue({ running: false, port: 4750 }),
    getRemoteControlStatus: vi.fn().mockResolvedValue({
      running: false,
      port: 3006,
      pin: '',
      url: 'http://127.0.0.1:3006/',
      connectedCount: 0,
    }),
    onRemoteControlStatus: vi.fn(() => vi.fn()),
  } as unknown as Window['electronAPI'];

  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: electronAPI,
  });
}

function renderMenu({
  matchSettings = defaultMatchSettings,
  appSettings = defaultAppSettings,
  updateAppSettings = vi.fn(),
}: {
  matchSettings?: typeof defaultMatchSettings;
  appSettings?: AppSettings;
  updateAppSettings?: (updatedSettings: Partial<AppSettings>) => void;
} = {}) {
  installElectronAPI();
  const rendered = render(
    <SystemSettingsMenu
      open
      setOpen={() => undefined}
      matchSettings={matchSettings}
      incrementHomeTeamScore={() => undefined}
      incrementAwayTeamScore={() => undefined}
      startTime={() => undefined}
      stopTime={() => undefined}
      updateMatchState={() => undefined}
      matchState={defaultMatchState}
      time={{}}
      appSettings={appSettings}
      updateAppSettings={updateAppSettings}
    />
  );
  return { ...rendered, updateAppSettings };
}

async function connectDeck() {
  fireEvent.click(
    screen.getByRole('button', { name: /Connect to Stream Deck/ })
  );
  await act(async () => {});
}

function lastCall() {
  return connectToStreamDeck.mock.calls[
    connectToStreamDeck.mock.calls.length - 1
  ];
}

describe('SystemSettingsMenu stream deck pagination', () => {
  beforeEach(() => {
    connectToStreamDeck.mockReset();
    connectToStreamDeck.mockResolvedValue(undefined);
  });

  it('pages through scoring, phase, and screen sets and wraps around', async () => {
    renderMenu();
    await connectDeck();

    // Default settings: scoring set + 1 phase chunk (4 football phases) +
    // 2 screen chunks (6 screens split 5+1) = 4 sets.
    const [firstButtons, nextScreen] = lastCall();
    expect(firstButtons.map((b) => b.text)).toContain('Stop');

    await act(async () => nextScreen());
    expect(lastCall()[0].map((b) => b.text)).toContain('First Half');

    await act(async () => lastCall()[1]());
    expect(lastCall()[0].map((b) => b.text)).toContain('Score Bug');

    await act(async () => lastCall()[1]());
    // Second screen chunk holds the overflow screen
    expect(lastCall()[0]).toHaveLength(1);

    await act(async () => lastCall()[1]());
    // Wrapped back to the scoring set
    expect(lastCall()[0].map((b) => b.text)).toContain('Stop');
  });

  it('clamps a stale page index when the set count shrinks (penalties toggled off)', async () => {
    const { rerender } = renderMenu();
    await connectDeck();

    // Page to the last set (index 3 of 4)
    await act(async () => lastCall()[1]());
    await act(async () => lastCall()[1]());
    await act(async () => lastCall()[1]());
    expect(lastCall()[0]).toHaveLength(1);

    // Penalties off: screens drop to 5 -> one chunk -> 3 sets total. The
    // stale index 3 must clamp instead of indexing undefined (which used
    // to blank the deck and silently disconnect).
    rerender(
      <SystemSettingsMenu
        open
        setOpen={() => undefined}
        matchSettings={{ ...defaultMatchSettings, hasPenalties: false }}
        incrementHomeTeamScore={() => undefined}
        incrementAwayTeamScore={() => undefined}
        startTime={() => undefined}
        stopTime={() => undefined}
        updateMatchState={() => undefined}
        matchState={defaultMatchState}
        time={{}}
        appSettings={defaultAppSettings}
        updateAppSettings={() => undefined}
      />
    );
    await act(async () => {});

    const [clampedButtons] = lastCall();
    expect(clampedButtons).toBeDefined();
    expect(clampedButtons.length).toBeGreaterThan(0);
    expect(clampedButtons.map((b) => b.text)).not.toContain('Penalties');
  });
});

describe('SystemSettingsMenu moved Window Settings sections', () => {
  it('renders the Language, Scoreboard Clock, Keyboard Shortcuts, and OBS Browser Source panels', () => {
    renderMenu();

    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('Scoreboard Clock')).toBeInTheDocument();
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('OBS Browser Source')).toBeInTheDocument();
    // These panels join the pre-existing About + Connect to Stream Deck items.
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Connect to Stream Deck/ })
    ).toBeInTheDocument();
  });
});

describe('SystemSettingsMenu language selector', () => {
  it('renders the 8 supported language options inside a collapsible "Language" panel', () => {
    renderMenu();

    expect(screen.getByText('Language')).toBeInTheDocument();
    [
      'English',
      'Français',
      'Deutsch',
      'Italiano',
      'Español (España)',
      'Español (Latinoamérica)',
      'Português (Portugal)',
      'Português (Brasil)',
    ].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('marks the detected/default language selected when appSettings.language is unset', () => {
    renderMenu({ appSettings: { ...defaultAppSettings, language: undefined } });

    // getLanguage() falls back to detectLanguage(); jsdom's default
    // navigator.language is en-US, so English is selected.
    expect(screen.getByRole('button', { name: 'English' }).className).toMatch(
      /bg-green-300/
    );
  });

  it('marks the chosen language selected once appSettings.language is set', () => {
    renderMenu({ appSettings: { ...defaultAppSettings, language: 'de' } });

    expect(screen.getByRole('button', { name: 'Deutsch' }).className).toMatch(
      /bg-green-300/
    );
    expect(
      screen.getByRole('button', { name: 'English' }).className
    ).not.toMatch(/bg-green-300/);
  });

  it('calls updateAppSettings with the chosen language code when clicked', async () => {
    const user = userEvent.setup();
    const updateAppSettings = vi.fn();
    renderMenu({ updateAppSettings });

    await user.click(screen.getByRole('button', { name: 'Français' }));

    expect(updateAppSettings).toHaveBeenCalledWith({ language: 'fr' });
  });
});

describe('SystemSettingsMenu scoreboard clock', () => {
  it('selects 24-hour by default and switches to AM/PM on click', async () => {
    const user = userEvent.setup();
    const updateAppSettings = vi.fn();
    renderMenu({ updateAppSettings });

    expect(screen.getByRole('button', { name: '24-hour' }).className).toMatch(
      /bg-green-300/
    );

    await user.click(screen.getByRole('button', { name: 'AM/PM' }));

    expect(updateAppSettings).toHaveBeenCalledWith({ clockFormat: '12h' });
  });
});

describe('SystemSettingsMenu OBS browser source', () => {
  it('toggles the browser source on and shows the status line', async () => {
    const user = userEvent.setup();
    const updateAppSettings = vi.fn();
    renderMenu({ updateAppSettings });

    // Both the browser source and the phone remote render a "Status: Stopped"
    // line while off; the browser source toggle is the first switch.
    expect((await screen.findAllByText(/Status: Stopped/)).length).toBe(2);

    const [toggle] = screen.getAllByRole('switch');
    await user.click(toggle);

    expect(updateAppSettings).toHaveBeenCalledWith({
      browserSource: { enabled: true, port: 4750 },
    });
  });
});

describe('SystemSettingsMenu keyboard shortcuts', () => {
  it('renders a row for each configurable shortcut', () => {
    renderMenu();

    expect(screen.getByText('Next match phase')).toBeInTheDocument();
    expect(screen.getByText('Home team scored')).toBeInTheDocument();
    expect(screen.getByText('Away team scored')).toBeInTheDocument();
  });
});
