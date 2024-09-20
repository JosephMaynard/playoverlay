import { DisplayScreen } from '../../../constants';
import { CustomScreen } from '../../../types';

export interface Props {
  overlays: CustomScreen[];
  activeScreen: DisplayScreen;
}

export default function OverlaysLayout({ overlays, activeScreen }: Props) {
  return (
    <div className="absolute left-0 top-0 h-full w-full">
      {overlays
        .filter((overlay) => overlay?.overlayLinks.includes(activeScreen))
        .map((overlay) => (
          <div
            style={{
              backgroundImage: `url("${overlay.url}")`,
            }}
            className="absolute left-0 top-0 h-full w-full bg-contain bg-center bg-no-repeat"
          />
        ))}
    </div>
  );
}
