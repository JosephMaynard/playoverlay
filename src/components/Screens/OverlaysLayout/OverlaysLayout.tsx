import { DisplayScreen } from '../../../constants';
import { CustomScreen } from '../../../types';

export interface Props {
  overlays: CustomScreen[];
  activeScreen: DisplayScreen;
}

// `overlays` is defaulted so a malformed matchState arriving without an
// overlays array (e.g. over the browser-source WebSocket) can't crash the
// whole display tree.
export default function OverlaysLayout({ overlays = [], activeScreen }: Props) {
  return (
    <div className="absolute left-0 top-0 h-full w-full">
      {overlays
        .filter((overlay) => overlay?.overlayLinks?.includes(activeScreen))
        .map((overlay) => (
          <div
            key={overlay.filePath}
            style={{
              backgroundImage: `url("${overlay.url}")`,
            }}
            className="absolute left-0 top-0 h-full w-full bg-contain bg-center bg-no-repeat"
          />
        ))}
    </div>
  );
}
