import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { defaultNS, namespaces, resources } from './index';

// Initialises the shared i18next singleton with every bundled catalogue and
// the react-i18next bindings. Resources are bundled at build time, so this
// is synchronous and no <Suspense> boundary is needed. Called by the host
// app before it renders, rather than run as a side effect of importing this
// package, so each host decides when (and whether) i18next starts and can
// hang its own platform wiring off the result (the Electron renderers keep
// <html lang> in sync, for example).
//
// Guards against a duplicate init if it is called more than once (hot
// reload, or a test re-importing the host's entry): i18next would otherwise
// reset a language a caller may already have set.
export function initI18n() {
  if (!i18n.isInitialized) {
    // i18next's default export is a pre-built singleton that also exposes
    // `use`; eslint-plugin-import can't distinguish that from the named
    // export, so this is the correct documented react-i18next call, not the
    // mistake it guards.
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
  return i18n;
}
