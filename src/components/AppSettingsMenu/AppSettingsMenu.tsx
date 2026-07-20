import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppSettings, Display } from '../../types';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ColourPicker from '../ColorPicker/ColorPicker';
import {
  ArrowsPointingOutIcon,
  LockClosedIcon,
  LockOpenIcon,
} from '@heroicons/react/24/outline';
import SideMenu from '../SideMenu/SideMenu';

export interface Props {
  open: boolean;
  setOpen: () => void;
  appSettings: AppSettings;
  updateAppSettings: (updatedSettings: Partial<AppSettings>) => void;
}

export default function AppSettingsMenu({
  open,
  setOpen,
  appSettings,
  updateAppSettings,
}: Props) {
  const { t } = useTranslation();
  const [displays, setDisplays] = useState<Display[]>([]);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    // Request initial screens information on component mount
    window?.electronAPI?.getScreenInfo();

    // Set up the listener for when the screens information is updated
    const cleanupScreensInfo = window?.electronAPI?.onScreenInfo(setDisplays);
    // Set up the listener for dynamic display changes
    const cleanupDisplayChange =
      window?.electronAPI?.onDisplayChange(setDisplays);

    // Fetch initial lock status
    window?.electronAPI?.getLockStatus();
    // Set up the listener for dynamic display changes
    const cleanupLockStatus = window?.electronAPI?.onLockStatus(setIsLocked);

    // Cleanup both listeners when the component unmounts
    return () => {
      cleanupScreensInfo();
      cleanupDisplayChange();
      cleanupLockStatus();
    };
  }, []);

  const handleMoveWindow = (screenId: number) => {
    window?.electronAPI?.moveWindowToScreen(screenId);
  };

  const handleLockWindows = () => {
    window?.electronAPI?.lockWindows();
    setIsLocked(true);
  };

  const handleUnlockWindows = () => {
    window?.electronAPI?.unlockWindows();
    setIsLocked(false);
  };

  return (
    <SideMenu open={open} setOpen={setOpen} title={t('settings:appMenu.title')}>
      <CollapsiblePanel title={t('settings:appMenu.keyColour')}>
        <ColourPicker
          label={t('settings:appMenu.keyColour')}
          onChange={(keyColour: string) => {
            updateAppSettings({ keyColour });
          }}
          value={appSettings.keyColour}
          disabled={isLocked}
        />
      </CollapsiblePanel>
      <CollapsiblePanel title={t('settings:appMenu.windowControls.title')}>
        {displays.length > 1 ? (
          <ButtonGrid
            compact
            buttons={[
              ...displays.map((display, index) => ({
                label: t('settings:appMenu.displays.moveToScreen', {
                  n: index + 1,
                }),
                onClick: () => handleMoveWindow(display.id),
                disabled: isLocked,
                icon: (
                  <ArrowsPointingOutIcon
                    className="-ml-0.5 h-5 w-5"
                    aria-hidden="true"
                  />
                ),
              })),
            ]}
          />
        ) : (
          <p className="my-12">{t('settings:appMenu.displays.none')}</p>
        )}
        <ButtonGrid
          className="mt-4"
          buttons={[
            {
              label: t('settings:appMenu.windowControls.toggleFullscreen'),
              onClick: () => window?.electronAPI?.toggleFullscreen(),
              color: 'text-white',
              backgroundColor: 'bg-indigo-600',
              disabled: isLocked,
            },
            {
              label: t('settings:appMenu.windowControls.resetPositions'),
              onClick: () => window?.electronAPI?.resetWindows(),
              color: 'text-white',
              backgroundColor: 'bg-indigo-600',
              disabled: isLocked,
            },
            {
              label: isLocked
                ? t('settings:appMenu.windowControls.unlockWindows')
                : t('settings:appMenu.windowControls.lockWindows'),
              onClick: isLocked ? handleUnlockWindows : handleLockWindows,
              color: 'text-white',
              backgroundColor: isLocked ? 'bg-red-600' : 'bg-green-600',
              icon: isLocked ? (
                <LockOpenIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
              ) : (
                <LockClosedIcon
                  className="-ml-0.5 h-5 w-5"
                  aria-hidden="true"
                />
              ),
            },
          ]}
        />
      </CollapsiblePanel>
    </SideMenu>
  );
}
