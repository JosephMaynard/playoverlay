// Every translation catalogue, bundled at build time (no HTTP backend), as
// the resources object i18next takes. The imports are spelled out one by one
// rather than discovered with Vite's import.meta.glob: Metro (the React
// Native bundler) has no equivalent, and a static list works in every
// bundler this package is consumed by. Adding a language or a namespace
// therefore means adding its imports here as well as its JSON files.
//
// Deliberately free of i18next and React imports (./init.ts does the
// i18next setup), so this entry point (@playoverlay/core/i18n) can be read by
// code that must not pull React into its bundle, such as the Electron main
// process.

import deCommon from './locales/de/common.json';
import deDashboard from './locales/de/dashboard.json';
import dePreflight from './locales/de/preflight.json';
import deScreens from './locales/de/screens.json';
import deSettings from './locales/de/settings.json';
import deUndo from './locales/de/undo.json';
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enPreflight from './locales/en/preflight.json';
import enScreens from './locales/en/screens.json';
import enSettings from './locales/en/settings.json';
import enUndo from './locales/en/undo.json';
import es419Common from './locales/es-419/common.json';
import es419Dashboard from './locales/es-419/dashboard.json';
import es419Preflight from './locales/es-419/preflight.json';
import es419Screens from './locales/es-419/screens.json';
import es419Settings from './locales/es-419/settings.json';
import es419Undo from './locales/es-419/undo.json';
import esESCommon from './locales/es-ES/common.json';
import esESDashboard from './locales/es-ES/dashboard.json';
import esESPreflight from './locales/es-ES/preflight.json';
import esESScreens from './locales/es-ES/screens.json';
import esESSettings from './locales/es-ES/settings.json';
import esESUndo from './locales/es-ES/undo.json';
import frCommon from './locales/fr/common.json';
import frDashboard from './locales/fr/dashboard.json';
import frPreflight from './locales/fr/preflight.json';
import frScreens from './locales/fr/screens.json';
import frSettings from './locales/fr/settings.json';
import frUndo from './locales/fr/undo.json';
import itCommon from './locales/it/common.json';
import itDashboard from './locales/it/dashboard.json';
import itPreflight from './locales/it/preflight.json';
import itScreens from './locales/it/screens.json';
import itSettings from './locales/it/settings.json';
import itUndo from './locales/it/undo.json';
import ptBRCommon from './locales/pt-BR/common.json';
import ptBRDashboard from './locales/pt-BR/dashboard.json';
import ptBRPreflight from './locales/pt-BR/preflight.json';
import ptBRScreens from './locales/pt-BR/screens.json';
import ptBRSettings from './locales/pt-BR/settings.json';
import ptBRUndo from './locales/pt-BR/undo.json';
import ptPTCommon from './locales/pt-PT/common.json';
import ptPTDashboard from './locales/pt-PT/dashboard.json';
import ptPTPreflight from './locales/pt-PT/preflight.json';
import ptPTScreens from './locales/pt-PT/screens.json';
import ptPTSettings from './locales/pt-PT/settings.json';
import ptPTUndo from './locales/pt-PT/undo.json';

export const defaultNS = 'common';

type Catalogue = Record<string, unknown>;

export const resources: Record<string, Record<string, Catalogue>> = {
  de: {
    common: deCommon,
    dashboard: deDashboard,
    preflight: dePreflight,
    screens: deScreens,
    settings: deSettings,
    undo: deUndo,
  },
  en: {
    common: enCommon,
    dashboard: enDashboard,
    preflight: enPreflight,
    screens: enScreens,
    settings: enSettings,
    undo: enUndo,
  },
  'es-419': {
    common: es419Common,
    dashboard: es419Dashboard,
    preflight: es419Preflight,
    screens: es419Screens,
    settings: es419Settings,
    undo: es419Undo,
  },
  'es-ES': {
    common: esESCommon,
    dashboard: esESDashboard,
    preflight: esESPreflight,
    screens: esESScreens,
    settings: esESSettings,
    undo: esESUndo,
  },
  fr: {
    common: frCommon,
    dashboard: frDashboard,
    preflight: frPreflight,
    screens: frScreens,
    settings: frSettings,
    undo: frUndo,
  },
  it: {
    common: itCommon,
    dashboard: itDashboard,
    preflight: itPreflight,
    screens: itScreens,
    settings: itSettings,
    undo: itUndo,
  },
  'pt-BR': {
    common: ptBRCommon,
    dashboard: ptBRDashboard,
    preflight: ptBRPreflight,
    screens: ptBRScreens,
    settings: ptBRSettings,
    undo: ptBRUndo,
  },
  'pt-PT': {
    common: ptPTCommon,
    dashboard: ptPTDashboard,
    preflight: ptPTPreflight,
    screens: ptPTScreens,
    settings: ptPTSettings,
    undo: ptPTUndo,
  },
};

// Namespaces are derived from English (the complete base catalogue).
export const namespaces = Object.keys(resources.en ?? {});
