import React, { useEffect, useState } from 'react';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import { Display } from '../../types';
import ButtonGrid from '../ButtonGrid/ButtonGrid';

const WindowControlsPanel: React.FC = () => {
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
    <CollapsiblePanel
      title="Display Window Controls"
      className="mx-auto max-w-4xl"
    >
      <ButtonGrid
        className="mb-4"
        buttons={[
          ...displays.map((display) => ({
            label: `Move to Screen ${display.id}`,
            onClick: () => handleMoveWindow(display.id),
          })),
          {
            label: 'Toggle Fullscreen',
            onClick: () => window?.electronAPI?.toggleFullscreen(),
            color: 'text-white',
            backgroundColor: 'bg-indigo-600',
          },
        ]}
      />
    </CollapsiblePanel>
  );
};

export default WindowControlsPanel;
