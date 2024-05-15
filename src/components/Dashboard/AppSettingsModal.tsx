import { useEffect, useState } from 'react';
import { AppSettings, Display } from '../../types';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import ColourPicker from '../ColorPicker/ColorPicker';
import WideModal from '../Modal/WideModal';

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

  useEffect(() => {
    // Request initial screens information on component mount
    window?.electronAPI?.getScreenInfo();

    // Set up the listener for when the screens information is updated
    const cleanupScreensInfo = window?.electronAPI?.onScreenInfo(setDisplays);
    // Set up the listener for dynamic display changes
    const cleanupDisplayChange =
      window?.electronAPI?.onDisplayChange(setDisplays);

    // Cleanup both listeners when the component unmounts
    return () => {
      cleanupScreensInfo();
      cleanupDisplayChange();
    };
  }, []);

  const handleMoveWindow = (screenId: number) => {
    window?.electronAPI?.moveWindowToScreen(screenId);
  };
  return (
    <WideModal open={open} setOpen={setOpen} title="App Settings">
      <ColourPicker
        label="Key Colour"
        onChange={(keyColour: string) => {
          updateAppSettings({ keyColour });
        }}
        value={appSettings.keyColour}
      />
      {displays.length > 1 ? (
        <ButtonGrid
          className="mt-4"
          buttons={[
            ...displays.map((display, index) => ({
              label: `Move to Screen ${index + 1}`,
              onClick: () => handleMoveWindow(display.id),
            })),
          ]}
        />
      ) : (
        <p>No external displays detected.</p>
      )}
      <ButtonGrid
        className="mt-4"
        buttons={[
          {
            label: 'Toggle Fullscreen',
            onClick: () => window?.electronAPI?.toggleFullscreen(),
            color: 'text-white',
            backgroundColor: 'bg-indigo-600',
          },
          {
            label: 'Reset positions',
            onClick: () => window?.electronAPI?.resetWindows(),
            color: 'text-white',
            backgroundColor: 'bg-indigo-600',
          },
        ]}
      />
    </WideModal>
  );
}
