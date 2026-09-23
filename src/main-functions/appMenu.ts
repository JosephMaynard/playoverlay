import type { MenuItemConstructorOptions } from 'electron';
import { LanguageCode } from '../types';
import en from '../i18n/locales/en/common.json';
import fr from '../i18n/locales/fr/common.json';
import de from '../i18n/locales/de/common.json';
import it from '../i18n/locales/it/common.json';
import esES from '../i18n/locales/es-ES/common.json';
import es419 from '../i18n/locales/es-419/common.json';
import ptPT from '../i18n/locales/pt-PT/common.json';
import ptBR from '../i18n/locales/pt-BR/common.json';

// The native app menu is built in the main process, which has no i18next
// instance (src/i18n/index.ts relies on Vite's import.meta.glob and React
// bindings meant for the renderers). Only the small common.json catalogues
// are imported here, statically, so the main bundle carries the handful of
// menu labels and nothing else from the renderer's translations.
type AppMenuLabels = typeof en.appMenu;

const catalogues: Record<LanguageCode, { appMenu?: Partial<AppMenuLabels> }> = {
  en,
  fr,
  de,
  it,
  'es-ES': esES,
  'es-419': es419,
  'pt-PT': ptPT,
  'pt-BR': ptBR,
};

// English fills any label a catalogue is missing, the same fallback the
// renderers get from i18next's fallbackLng.
export function getAppMenuLabels(language: LanguageCode): AppMenuLabels {
  return { ...en.appMenu, ...catalogues[language]?.appMenu };
}

// Undo and Redo are deliberately absent from the Edit menu. The dashboard
// binds Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z itself for match undo (see
// Dashboard.tsx), and whether a menu accelerator reaches the page's keydown
// handler first is platform-dependent in Electron and not documented as
// guaranteed. A menu item that swallowed those keys would silently break
// match undo, so text-field undo stays with Chromium's built-in handling.
export function buildAppMenuTemplate(
  language: LanguageCode
): MenuItemConstructorOptions[] {
  const labels = getAppMenuLabels(language);
  return [
    {
      // The product name, never translated.
      label: 'PlayOverlay',
      submenu: [
        { role: 'about', label: labels.about },
        { type: 'separator' },
        { role: 'quit', label: labels.quit },
      ],
    },
    {
      label: labels.edit,
      submenu: [
        { role: 'cut', label: labels.cut, accelerator: 'CmdOrCtrl+X' },
        { role: 'copy', label: labels.copy, accelerator: 'CmdOrCtrl+C' },
        { role: 'paste', label: labels.paste, accelerator: 'CmdOrCtrl+V' },
        {
          role: 'selectAll',
          label: labels.selectAll,
          accelerator: 'CmdOrCtrl+A',
        },
      ],
    },
  ];
}
