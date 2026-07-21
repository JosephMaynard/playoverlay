// Single shared react-i18next init, used by both the control window (App.tsx)
// and the display/browser-source window (DisplayApp.tsx / Display.tsx).
// Resources are bundled at build time (no HTTP backend), so initialization is
// synchronous and no <Suspense> boundary is needed.
//
// English namespaces are auto-loaded from ./locales/en/*.json by filename, so
// a new area of the UI just adds its own `en/<namespace>.json`, no edit to
// this file, which lets string-extraction work happen in parallel without
// colliding here. The other language catalogues are added in W3.
/// <reference types="vite/client" />
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const defaultNS = 'common';

// Eagerly import every namespace JSON for every locale. Keyed by
// './locales/<lang>/<namespace>.json', so adding a language is just dropping
// its `locales/<lang>/*.json` files, no edit here.
const localeModules = import.meta.glob('./locales/*/*.json', {
  eager: true,
}) as Record<string, { default: Record<string, unknown> }>;

const resources: Record<string, Record<string, Record<string, unknown>>> = {};
for (const [path, module] of Object.entries(localeModules)) {
  const parts = path.split('/');
  const namespace = parts.pop()!.replace(/\.json$/, '');
  const lang = parts.pop()!;
  (resources[lang] ??= {})[namespace] = module.default;
}

export { resources };

// Namespaces are derived from English (the complete base catalogue).
export const namespaces = Object.keys(resources.en ?? {});

// Guards against a duplicate init if this module is imported more than once
// (hot-reload, or a test re-importing it): i18next would otherwise reset the
// language a caller may already have set.
if (!i18n.isInitialized) {
  // i18next's default export is a pre-built singleton that also exposes `use`;
  // eslint-plugin-import can't distinguish that from the named export, so this
  // is the correct documented react-i18next call, not the mistake it guards.
  // eslint-disable-next-line import/no-named-as-default-member
  i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    defaultNS,
    ns: namespaces.length > 0 ? namespaces : [defaultNS],
    interpolation: {
      // React already escapes interpolated values when rendering JSX.
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

  // Keep the root <html lang> in sync with the active language, on both
  // windows (App.tsx and Display.tsx each drive i18n.changeLanguage from
  // their own appSettings.language). This is what tells assistive tech
  // (and the browser's own spell-check/hyphenation) which language the page
  // is in, so it's set once for the language i18next starts on, then kept
  // current as the operator changes it. i18n.language is always one of the
  // eight shipped catalogue codes (see LanguageCode in src/types.ts), so no
  // extra mapping is needed here.
  if (typeof document !== 'undefined') {
    document.documentElement.lang = i18n.language;
    i18n.on('languageChanged', (lng) => {
      document.documentElement.lang = lng;
    });
  }
}

export default i18n;
