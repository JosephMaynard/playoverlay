// Single shared react-i18next init, used by both the control window (App.tsx)
// and the display/browser-source window (DisplayApp.tsx / Display.tsx).
// Resources are bundled at build time (imported JSON, no HTTP backend), so
// initialization is synchronous and no <Suspense> boundary is needed.
//
// W1 seeds only the English catalogue with just enough keys to prove the
// wiring end-to-end (language names + the first-run modal). Bulk string
// extraction (more namespaces, more keys) happens in W2; the other seven
// language catalogues are added in W3 — this module is where both later
// waves register their additions.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';

export const defaultNS = 'common';

export const resources = {
  en: {
    common: enCommon,
  },
} as const;

// Guards against a duplicate init if this module is ever imported more than
// once in the same runtime (e.g. hot-reload, or a test re-importing it) —
// i18next logs a warning and no-ops internally anyway, but skipping the call
// entirely avoids resetting language state a caller may have already set.
if (!i18n.isInitialized) {
  // i18next's default export is a pre-built singleton instance that also
  // happens to expose `use` as a named export of the module (for consumers
  // building a fresh instance via createInstance()) — eslint-plugin-import's
  // no-named-as-default-member can't tell those apart, so `i18n.use(...)`
  // here is the correct, documented react-i18next call, not the mistake the
  // rule is guarding against.
  // eslint-disable-next-line import/no-named-as-default-member
  i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    defaultNS,
    ns: ['common'],
    interpolation: {
      // React already escapes interpolated values when rendering JSX.
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export default i18n;
