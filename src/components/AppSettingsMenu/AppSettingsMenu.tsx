import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppSettings, Display } from '@playoverlay/core';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ColourPicker from '../ColorPicker/ColorPicker';
import {
  ArrowsPointingOutIcon,
  LockClosedIcon,
  LockOpenIcon,
} from '@heroicons/react/24/outline';
import SideMenu from '../SideMenu/SideMenu';
import Toggle from '../ui/Toggle';

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
      <CollapsiblePanel title={t('settings:appMenu.goals.title')}>
        <Toggle
          checked={appSettings.askForScorer !== false}
          onChange={(askForScorer) => updateAppSettings({ askForScorer })}
          label={t('settings:appMenu.goals.askForScorer')}
          description={t('settings:appMenu.goals.askForScorerHint')}
        />
        <Toggle
          className="mt-4"
          checked={appSettings.showGoalBannerAutomatically !== false}
          onChange={(showGoalBannerAutomatically) =>
            updateAppSettings({ showGoalBannerAutomatically })
          }
          label={t('settings:appMenu.goals.bannerAuto')}
          description={t('settings:appMenu.goals.bannerAutoHint')}
        />
      </CollapsiblePanel>
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
          <p className="text-sm text-muted">
            {t('settings:appMenu.displays.none')}
          </p>
        )}
        {/* Stacked: three labels this long wrap badly side by side in a
            drawer. */}
        <ButtonGrid
          className="mt-4"
          columns={1}
          buttons={[
            {
              label: t('settings:appMenu.windowControls.toggleFullscreen'),
              onClick: () => window?.electronAPI?.toggleFullscreen(),
              disabled: isLocked,
            },
            {
              label: t('settings:appMenu.windowControls.resetPositions'),
              onClick: () => window?.electronAPI?.resetWindows(),
              disabled: isLocked,
            },
            {
              label: isLocked
                ? t('settings:appMenu.windowControls.unlockWindows')
                : t('settings:appMenu.windowControls.lockWindows'),
              onClick: isLocked ? handleUnlockWindows : handleLockWindows,
              // Locking is what an operator does before kick-off, so it is
              // the panel's main action; once locked, unlocking is a
              // deliberate step back and reads as secondary.
              variant: isLocked ? 'secondary' : 'primary',
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
