import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useTranslation } from 'react-i18next';
import './i18n';
import Dashboard from './components/Dashboard/Dashboard';
import LanguageModal from './components/LanguageModal/LanguageModal';
import { useAppSettingsStore } from './store/appSettings';
import { detectLanguage } from './utils';

// Thin wrapper around Dashboard: owns the two pieces of i18n wiring that
// don't belong inside Dashboard itself (which is owned by a later wave) —
// keeping the control window's own UI in sync with the operator's chosen
// (or detected, pending choice) language, and gating the first-run picker.
// Both read the same appSettings zustand store Dashboard populates from IPC
// on mount, so no separate fetch is needed here.
function ControlRoot() {
  const { i18n } = useTranslation();
  const appSettings = useAppSettingsStore((state) => state.appSettings);
  const setAppSettings = useAppSettingsStore((state) => state.setAppSettings);
  const settingsLoaded = useAppSettingsStore((state) => state.settingsLoaded);

  useEffect(() => {
    i18n.changeLanguage(appSettings.language ?? detectLanguage());
  }, [appSettings.language, i18n]);

  return (
    <>
      <Dashboard />
      {/* Held back until settings have loaded, so the picker only appears on
          a genuine first run — not as a flash while a returning user's saved
          language arrives async over IPC. */}
      {settingsLoaded && (
        <LanguageModal
          language={appSettings.language}
          onConfirm={(language) => setAppSettings({ language })}
        />
      )}
    </>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}
const root = createRoot(rootElement);
root.render(<ControlRoot />);
