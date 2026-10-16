import { shell, type MenuItemConstructorOptions } from 'electron';
import { LanguageCode } from '@playoverlay/core/types';
import { SUPPORT_URL, WEBSITE_URL } from '@playoverlay/core/constants';
import { logError } from './logger';
import en from '@playoverlay/core/i18n/locales/en/common.json';
import fr from '@playoverlay/core/i18n/locales/fr/common.json';
import de from '@playoverlay/core/i18n/locales/de/common.json';
import it from '@playoverlay/core/i18n/locales/it/common.json';
import esES from '@playoverlay/core/i18n/locales/es-ES/common.json';
import es419 from '@playoverlay/core/i18n/locales/es-419/common.json';
import ptPT from '@playoverlay/core/i18n/locales/pt-PT/common.json';
import ptBR from '@playoverlay/core/i18n/locales/pt-BR/common.json';

// The native app menu is built in the main process, which has no i18next
// instance (that is started in the renderers, with React bindings the main
// bundle must not carry). Only the small common.json catalogues are imported
// here, straight from @playoverlay/core's locale files, so the main bundle
// carries the handful of menu labels and nothing else from the renderers'
// translations.
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
// shell.openExternal rejects when no browser is available; a menu click has
// nowhere to surface that, so it goes to the log like the IPC handler's does.
function openInBrowser(url: string): void {
  shell.openExternal(url).catch((error) => {
    logError(`Failed to open URL in browser: ${String(error)}`);
  });
}

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
    {
      role: 'help',
      label: labels.help,
      submenu: [
        { label: labels.support, click: () => openInBrowser(SUPPORT_URL) },
        { label: labels.website, click: () => openInBrowser(WEBSITE_URL) },
      ],
    },
  ];
}
