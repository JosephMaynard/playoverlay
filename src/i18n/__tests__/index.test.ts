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
    expect(i18n.t('languageModal.title')).toBe('Choose a language');
    expect(i18n.t('language.fr')).toBe('Français');
  });

  it('propagates changeLanguage calls (this is what App.tsx/Display.tsx drive from appSettings.language)', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.language).toBe('fr');

    // No French catalogue yet (W1 is English-only); fallbackLng keeps the
    // seeded key readable instead of showing raw key strings.
    expect(i18n.t('languageModal.title')).toBe('Choose a language');

    // Reset for any other test file sharing this module-scope singleton.
    await i18n.changeLanguage('en');
  });

  it('never escapes interpolated values itself (React already escapes on render)', () => {
    expect(i18n.options.interpolation?.escapeValue).toBe(false);
  });
});
