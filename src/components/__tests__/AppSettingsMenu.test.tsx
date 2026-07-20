import { fireEvent, render, screen } from '@testing-library/react';
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
    moveWindowToScreen: vi.fn(),
    toggleFullscreen: vi.fn(),
    resetWindows: vi.fn(),
    lockWindows: vi.fn(),
    unlockWindows: vi.fn(),
  } as unknown as Window['electronAPI'];

  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: electronAPI,
  });

  return electronAPI;
}

function renderMenu(appSettings: AppSettings = defaultAppSettings) {
  const updateAppSettings = vi.fn();
  const electronAPI = installElectronAPI();
  render(
    <AppSettingsMenu
      open
      setOpen={() => undefined}
      appSettings={appSettings}
      updateAppSettings={updateAppSettings}
    />
  );
  return { updateAppSettings, electronAPI };
}

describe('AppSettingsMenu key colour', () => {
  it('renders the Key Colour panel and reports colour changes', async () => {
    const { updateAppSettings } = renderMenu();

    expect(screen.getAllByText('Key Colour').length).toBeGreaterThan(0);

    const input = screen.getByLabelText('Key Colour') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '#ff0000' } });

    expect(updateAppSettings).toHaveBeenCalledWith({ keyColour: '#ff0000' });
  });
});

describe('AppSettingsMenu window controls', () => {
  it('toggles fullscreen, resets positions, and locks/unlocks windows', async () => {
    const user = userEvent.setup();
    const { electronAPI } = renderMenu();

    await user.click(screen.getByRole('button', { name: 'Toggle Fullscreen' }));
    expect(electronAPI.toggleFullscreen).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Reset positions' }));
    expect(electronAPI.resetWindows).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Lock Windows' }));
    expect(electronAPI.lockWindows).toHaveBeenCalled();

    expect(
      await screen.findByRole('button', { name: 'Unlock Windows' })
    ).toBeInTheDocument();
  });

  it('shows a "no external displays" message when there is only one display', () => {
    renderMenu();

    expect(
      screen.getByText('No external displays detected.')
    ).toBeInTheDocument();
  });
});
