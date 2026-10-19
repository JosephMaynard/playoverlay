import { describe, expect, it } from 'vitest';
import { applyTheme, resolveTheme } from '../theme';

describe('resolveTheme', () => {
  it('follows the OS when the setting is unset or system', () => {
    expect(resolveTheme(undefined, true)).toBe('dark');
    expect(resolveTheme(undefined, false)).toBe('light');
    expect(resolveTheme('system', true)).toBe('dark');
  });

  it('lets an explicit choice override the OS', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('applyTheme', () => {
  it('writes the theme onto the root element for the CSS to read', () => {
    const root = document.createElement('html');
    applyTheme('dark', root);
    expect(root.dataset.theme).toBe('dark');
    applyTheme('light', root);
    expect(root.dataset.theme).toBe('light');
  });
});
