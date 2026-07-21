import { describe, expect, it } from 'vitest';
import i18n, { defaultNS, resources } from '../index';

describe('i18n init', () => {
  it('initializes synchronously with the English catalogue bundled (no HTTP backend)', () => {
    expect(i18n.isInitialized).toBe(true);
    expect(resources.en.common).toBeDefined();
    expect(defaultNS).toBe('common');
  });

  it('starts on English and falls back to English for any other language', () => {
    expect(i18n.language).toBe('en');
    expect(i18n.options.fallbackLng).toEqual(['en']);
  });

  it('translates a seeded key in English', () => {
    expect(i18n.t('settings:language.modal.title')).toBe('Choose a language');
    expect(i18n.t('language.fr')).toBe('Français');
  });

  it('propagates changeLanguage calls (this is what App.tsx/Display.tsx drive from appSettings.language)', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.language).toBe('fr');

    // The French catalogue is bundled (v0.18), so the seeded key now reads
    // in French rather than falling back to English.
    expect(i18n.t('settings:language.modal.title')).toBe('Choisir une langue');

    // A locale with no catalogue still falls back to English instead of
    // showing raw key strings.
    await i18n.changeLanguage('xx');
    expect(i18n.t('settings:language.modal.title')).toBe('Choose a language');

    // Reset for any other test file sharing this module-scope singleton.
    await i18n.changeLanguage('en');
  });

  it('keeps <html lang> in sync with the active language, for both windows', async () => {
    expect(document.documentElement.lang).toBe('en');

    await i18n.changeLanguage('fr');
    expect(document.documentElement.lang).toBe('fr');

    await i18n.changeLanguage('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('never escapes interpolated values itself (React already escapes on render)', () => {
    expect(i18n.options.interpolation?.escapeValue).toBe(false);
  });
});
