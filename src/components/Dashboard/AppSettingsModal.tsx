import { useEffect, useState } from 'react';
import { AppSettings, Display } from '../../types';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
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

export default function AppSettingsModal({
  open,
  setOpen,
  appSettings,
  updateAppSettings,
}: Props) {
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
    <SideMenu open={open} setOpen={setOpen} title="Window Settings">
      <div className="my-4 max-w-64 rounded-md border border-gray-200 bg-white p-4 shadow">
        <ColourPicker
          label="Key Colour"
          onChange={(keyColour: string) => {
            updateAppSettings({ keyColour });
          }}
          value={appSettings.keyColour}
          disabled={isLocked}
        />
      </div>
      {displays.length > 1 ? (
        <ButtonGrid
          compact
          className="mt-4"
          buttons={[
            ...displays.map((display, index) => ({
              label: `Move to Screen ${index + 1}`,
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
        <p className="my-12">No external displays detected.</p>
      )}
      <ButtonGrid
        className="mt-4"
        buttons={[
          {
            label: 'Toggle Fullscreen',
            onClick: () => window?.electronAPI?.toggleFullscreen(),
            color: 'text-white',
            backgroundColor: 'bg-indigo-600',
            disabled: isLocked,
          },
          {
            label: 'Reset positions',
            onClick: () => window?.electronAPI?.resetWindows(),
            color: 'text-white',
            backgroundColor: 'bg-indigo-600',
            disabled: isLocked,
          },
          {
            label: isLocked ? 'Unlock Windows' : 'Lock Windows',
            onClick: isLocked ? handleUnlockWindows : handleLockWindows,
            color: 'text-white',
            backgroundColor: isLocked ? 'bg-red-600' : 'bg-green-600',
            icon: isLocked ? (
              <LockOpenIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            ) : (
              <LockClosedIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            ),
          },
        ]}
      />
    </SideMenu>
  );
}
