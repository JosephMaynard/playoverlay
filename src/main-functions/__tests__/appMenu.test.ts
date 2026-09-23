import type { MenuItemConstructorOptions } from 'electron';
import { describe, expect, it } from 'vitest';
import { supportedLanguageCodes } from '../../types';
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
