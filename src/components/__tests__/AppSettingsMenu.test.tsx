import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { defaultAppSettings } from '../../constants';
import { AppSettings } from '../../types';
import AppSettingsMenu from '../AppSettingsMenu/AppSettingsMenu';

// AppSettingsMenu's screen/lock-status effect unsubscribes these on
// unmount, so — even though this test never triggers a display change —
// they must be mocked (not left as `window.electronAPI` being entirely
// undefined) or unmount throws.
function installElectronAPI() {
  const electronAPI = {
    getVersion: vi.fn(() => '0.18.0-test'),
    getScreenInfo: vi.fn(),
    onScreenInfo: vi.fn(() => vi.fn()),
    onDisplayChange: vi.fn(() => vi.fn()),
    getLockStatus: vi.fn(),
    onLockStatus: vi.fn(() => vi.fn()),
    getBrowserSourceStatus: vi
      .fn()
      .mockResolvedValue({ running: false, port: 4750 }),
  } as unknown as Window['electronAPI'];

  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: electronAPI,
  });
}

function renderMenu(appSettings: AppSettings = defaultAppSettings) {
  const updateAppSettings = vi.fn();
  installElectronAPI();
  render(
    <AppSettingsMenu
      open
      setOpen={() => undefined}
      appSettings={appSettings}
      updateAppSettings={updateAppSettings}
    />
  );
  return { updateAppSettings };
}

describe('AppSettingsMenu language selector', () => {
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
    renderMenu({ ...defaultAppSettings, language: undefined });

    // getLanguage() falls back to detectLanguage(); jsdom's default
    // navigator.language is en-US, so English is selected.
    expect(screen.getByRole('button', { name: 'English' }).className).toMatch(
      /bg-green-300/
    );
  });

  it('marks the chosen language selected once appSettings.language is set', () => {
    renderMenu({ ...defaultAppSettings, language: 'de' });

    expect(screen.getByRole('button', { name: 'Deutsch' }).className).toMatch(
      /bg-green-300/
    );
    expect(
      screen.getByRole('button', { name: 'English' }).className
    ).not.toMatch(/bg-green-300/);
  });

  it('calls updateAppSettings with the chosen language code when clicked', async () => {
    const user = userEvent.setup();
    const { updateAppSettings } = renderMenu();

    await user.click(screen.getByRole('button', { name: 'Français' }));

    expect(updateAppSettings).toHaveBeenCalledWith({ language: 'fr' });
  });
});
