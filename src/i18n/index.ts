// Single shared react-i18next init, used by both the control window (App.tsx)
// and the display/browser-source window (DisplayApp.tsx / Display.tsx). The
// catalogues and the i18next setup itself live in @playoverlay/core so the
// other PlayOverlay apps translate identically; this module only starts it
// for the Electron renderers and adds their DOM-specific wiring.
import i18n from 'i18next';
import { initI18n } from '@playoverlay/core';

export { defaultNS, namespaces, resources } from '@playoverlay/core/i18n';

if (!i18n.isInitialized) {
  initI18n();

  // Keep the root <html lang> in sync with the active language, on both
  // windows (App.tsx and Display.tsx each drive i18n.changeLanguage from
  // their own appSettings.language). This is what tells assistive tech
  // (and the browser's own spell-check/hyphenation) which language the page
  // is in, so it's set once for the language i18next starts on, then kept
  // current as the operator changes it. i18n.language is always one of the
  // eight shipped catalogue codes (see LanguageCode in @playoverlay/core's
  // types.ts), so no extra mapping is needed here.
  if (typeof document !== 'undefined') {
    document.documentElement.lang = i18n.language;
    i18n.on('languageChanged', (lng) => {
      document.documentElement.lang = lng;
    });
  }
}

export default i18n;
