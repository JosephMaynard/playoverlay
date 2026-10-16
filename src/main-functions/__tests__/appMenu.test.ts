import type { MenuItemConstructorOptions } from 'electron';
import { describe, expect, it, vi } from 'vitest';

const openExternal = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const logError = vi.hoisted(() => vi.fn());
vi.mock('electron', () => ({ shell: { openExternal } }));
vi.mock('../logger', () => ({ logError }));
import { supportedLanguageCodes } from '@playoverlay/core/types';
import { buildAppMenuTemplate, getAppMenuLabels } from '../appMenu';

function editItems(template: MenuItemConstructorOptions[]) {
  return template[1].submenu as MenuItemConstructorOptions[];
}

describe('buildAppMenuTemplate', () => {
  it('labels the menu in English by default', () => {
    const template = buildAppMenuTemplate('en');

    expect(template[0].label).toBe('PlayOverlay');
    expect(template[1].label).toBe('Edit');
    expect(editItems(template).map((item) => item.label)).toEqual([
      'Cut',
      'Copy',
      'Paste',
      'Select all',
    ]);
  });

  it("follows the operator's language", () => {
    const template = buildAppMenuTemplate('fr');

    expect(template[1].label).toBe('Édition');
    expect(editItems(template)[0].label).toBe('Couper');
    const appItems = template[0].submenu as MenuItemConstructorOptions[];
    expect(appItems.map((item) => item.label)).toContain('Quitter PlayOverlay');
  });

  it('includes Cut alongside Copy, Paste and Select all', () => {
    expect(editItems(buildAppMenuTemplate('en')).map((i) => i.role)).toEqual([
      'cut',
      'copy',
      'paste',
      'selectAll',
    ]);
  });

  it('leaves Undo and Redo to the dashboard, which binds those keys for match undo', () => {
    const roles = buildAppMenuTemplate('en').flatMap((menu) =>
      (menu.submenu as MenuItemConstructorOptions[]).map((item) => item.role)
    );
    expect(roles).not.toContain('undo');
    expect(roles).not.toContain('redo');
  });
});

describe('Help menu', () => {
  it('offers Support PlayOverlay and the website, opened in the system browser', () => {
    const help = buildAppMenuTemplate('en')[2];
    expect(help.role).toBe('help');
    expect(help.label).toBe('Help');
    const items = help.submenu as MenuItemConstructorOptions[];
    expect(items.map((item) => item.label)).toEqual([
      'Support PlayOverlay',
      'PlayOverlay website',
    ]);

    (items[0].click as () => void)();
    expect(openExternal).toHaveBeenCalledWith('https://ko-fi.com/magiczebra');
    (items[1].click as () => void)();
    expect(openExternal).toHaveBeenCalledWith('https://playoverlay.com');
  });

  it('logs instead of leaving a rejection when no browser opens', async () => {
    openExternal.mockRejectedValueOnce(new Error('no handler'));
    const items = buildAppMenuTemplate('en')[2]
      .submenu as MenuItemConstructorOptions[];
    (items[0].click as () => void)();
    await vi.waitFor(() =>
      expect(logError).toHaveBeenCalledWith(
        expect.stringContaining('no handler')
      )
    );
  });

  it('is translated like the rest of the menu', () => {
    expect(buildAppMenuTemplate('de')[2].label).toBe('Hilfe');
  });
});

describe('getAppMenuLabels', () => {
  it('has a complete, distinct-from-key label set for every shipped language', () => {
    const english = getAppMenuLabels('en');
    supportedLanguageCodes.forEach((language) => {
      const labels = getAppMenuLabels(language);
      expect(Object.keys(labels).sort()).toEqual(Object.keys(english).sort());
      Object.values(labels).forEach((label) => {
        expect(label).toEqual(expect.any(String));
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });
});
