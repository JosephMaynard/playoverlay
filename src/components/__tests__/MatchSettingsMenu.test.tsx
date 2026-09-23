import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultAppSettings, defaultMatchSettings } from '../../constants';
import { MatchSettings } from '../../zodSchemas';
import MatchSettingsMenu from '../MatchSettingsMenu/MatchSettingsMenu';

function installElectronAPI() {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      getVersion: vi.fn(() => '0.21.0-test'),
      getSavedMatchSettings: vi.fn().mockResolvedValue([]),
      setSavedMatchSettings: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as Window['electronAPI'],
  });
}

// Holds the settings in state like the real store does, so a commit flows
// back into the input's canonical value exactly as it would in the app.
function renderMenu(initial: Partial<MatchSettings>) {
  const updates: Array<Partial<MatchSettings>> = [];
  let setExternally: (settings: MatchSettings) => void = () => undefined;

  function Harness() {
    const [matchSettings, setMatchSettings] = useState<MatchSettings>({
      ...defaultMatchSettings,
      ...initial,
    });
    setExternally = setMatchSettings;
    return (
      <MatchSettingsMenu
        sidebarOpen
        setSidebarOpen={() => undefined}
        matchSettings={matchSettings}
        updateMatchSettings={(update) => {
          updates.push(update);
          setMatchSettings((previous) => ({ ...previous, ...update }));
        }}
        replaceMatchSettings={setMatchSettings}
        appSettings={defaultAppSettings}
      />
    );
  }

  render(<Harness />);
  return {
    updates,
    setExternally: (settings: MatchSettings) =>
      act(() => setExternally(settings)),
  };
}

function typeAndBlur(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

beforeEach(() => {
  installElectronAPI();
});

describe('MatchSettingsMenu numeric timer fields', () => {
  it.each(['0', '2.5', '-3', '51'])(
    'refuses period count %s with an inline error and leaves the setting alone',
    (typed) => {
      const { updates } = renderMenu({ timerMode: 'generic' });
      const input = screen.getByLabelText('Number of Periods');

      typeAndBlur(input, typed);

      expect(
        screen.getByText('Enter a whole number from 1 to 50.')
      ).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(updates).toEqual([]);
    }
  );

  it('accepts the schema maximum of 50 periods', () => {
    const { updates } = renderMenu({ timerMode: 'generic' });
    const input = screen.getByLabelText('Number of Periods');

    typeAndBlur(input, '50');

    expect(updates).toEqual([{ periodCount: 50 }]);
    expect(input).toHaveValue(50);
    expect(
      screen.queryByText('Enter a whole number from 1 to 50.')
    ).not.toBeInTheDocument();
  });

  it('shows the in-effect default after clearing a field that was already on its default', () => {
    // Regression: periodCount was already unset (engine uses 4), so clearing
    // it committed undefined without changing the canonical value and the
    // field kept showing the empty draft instead of 4.
    const { updates } = renderMenu({ timerMode: 'generic' });
    const input = screen.getByLabelText('Number of Periods');

    typeAndBlur(input, '');

    expect(updates).toEqual([{ periodCount: undefined }]);
    expect(input).toHaveValue(4);
  });

  it('keeps flagging an invalid half length typed twice rather than showing it as if applied', () => {
    const { updates } = renderMenu({ timerMode: 'football', halfLength: 45 });
    const input = screen.getByLabelText('Half Length');

    typeAndBlur(input, '0');
    typeAndBlur(input, '0');

    expect(updates).toEqual([]);
    expect(
      screen.getByText(
        'Enter a number of minutes above 0 and no more than 300.'
      )
    ).toBeInTheDocument();
  });

  it('refuses a half length above the schema maximum of 300', () => {
    const { updates } = renderMenu({ timerMode: 'football' });

    typeAndBlur(screen.getByLabelText('Half Length'), '301');

    expect(updates).toEqual([]);
  });

  it('commits a valid length on Enter and clears a previous error', () => {
    const { updates } = renderMenu({ timerMode: 'generic' });
    const input = screen.getByLabelText('Period Length');

    typeAndBlur(input, '0');
    fireEvent.change(input, { target: { value: '12.5' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(updates).toEqual([{ periodLength: 12.5 }]);
    expect(input).toHaveValue(12.5);
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('drops an invalid draft when the settings change from outside (e.g. a restore)', () => {
    const { setExternally } = renderMenu({ timerMode: 'generic' });
    const input = screen.getByLabelText('Number of Periods');

    typeAndBlur(input, '0');
    setExternally({
      ...defaultMatchSettings,
      timerMode: 'generic',
      periodCount: 6,
    });

    expect(input).toHaveValue(6);
    expect(
      screen.queryByText('Enter a whole number from 1 to 50.')
    ).not.toBeInTheDocument();
  });
});
