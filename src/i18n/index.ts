// Single shared react-i18next init, used by both the control window (App.tsx)
// and the display/browser-source window (DisplayApp.tsx / Display.tsx).
// Resources are bundled at build time (no HTTP backend), so initialization is
// synchronous and no <Suspense> boundary is needed.
//
// English namespaces are auto-loaded from ./locales/en/*.json by filename, so
// a new area of the UI just adds its own `en/<namespace>.json` — no edit to
// this file, which lets string-extraction work happen in parallel without
// colliding here. The other language catalogues are added in W3.
/// <reference types="vite/client" />
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const defaultNS = 'common';

// Eagerly import every English namespace JSON. Keyed by bare filename, e.g.
// './locales/en/settings.json' -> namespace 'settings'.
const enModules = import.meta.glob('./locales/en/*.json', {
  eager: true,
}) as Record<string, { default: Record<string, unknown> }>;

const enNamespaces: Record<string, Record<string, unknown>> = {};
for (const [path, module] of Object.entries(enModules)) {
  const namespace = path.split('/').pop()!.replace(/\.json$/, '');
  enNamespaces[namespace] = module.default;
}

export const resources = {
  en: enNamespaces,
};

export const namespaces = Object.keys(enNamespaces);

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
}

export default i18n;
