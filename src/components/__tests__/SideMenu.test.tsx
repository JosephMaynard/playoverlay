import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import SideMenu from '../SideMenu/SideMenu';

function installGetVersion(getVersion: () => string) {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: { getVersion } as unknown as Window['electronAPI'],
  });
}

function renderSideMenu() {
  return render(
    <SideMenu open setOpen={() => undefined} title="Settings">
      <p>content</p>
    </SideMenu>
  );
}

afterEach(() => {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: undefined,
  });
});

describe('SideMenu version line', () => {
  it('shows the real app version', () => {
    installGetVersion(() => '0.21.0');
    renderSideMenu();

    expect(screen.getByText('Version: 0.21.0')).toBeInTheDocument();
  });

  it('translates the version label', async () => {
    installGetVersion(() => '0.21.0');
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    renderSideMenu();

    expect(screen.getByText('Version : 0.21.0')).toBeInTheDocument();
  });

  it('hides the line instead of inventing a version when it is unknown', () => {
    // No preload bridge at all (e.g. a browser preview).
    renderSideMenu();

    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.queryByText(/Version/)).not.toBeInTheDocument();
    expect(screen.queryByText(/1\.0\.0/)).not.toBeInTheDocument();
  });

  it('hides the line when reading the version fails', () => {
    installGetVersion(
      vi.fn(() => {
        throw new Error('IPC unavailable');
      })
    );
    renderSideMenu();

    expect(screen.queryByText(/Version/)).not.toBeInTheDocument();
  });
});
