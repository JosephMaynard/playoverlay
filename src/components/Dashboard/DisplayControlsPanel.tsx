import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowPathIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import {
  CustomScreen,
  MatchState,
  DisplayScreen,
  screens,
  MatchSettings,
  ScreenRotationSettings as RotationSettings,
  customScreenKey,
  addCustomScreen,
  removeCustomScreen,
  isScreenOffered,
  availableRotationEntries,
} from '@playoverlay/core';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import ActionButton from '../ui/ActionButton';
import IconButton from '../ui/IconButton';
import ScreenRotationSettings from './ScreenRotationSettings';

// Local i18n key map (rather than translating the `screens` constant
// directly): the same approach as SystemSettingsMenu's Stream Deck screen
// buttons and EditCustomScreen's overlay-screen checkboxes, so all three
// surfaces show the same translated label for a given screen. The screen
// rotation set-up shares this one.
export const screenLabelKeys: Record<DisplayScreen, string> = {
  none: 'settings:system.screens.none',
  matchTitle: 'settings:system.screens.matchTitle',
  scoreBug: 'settings:system.screens.scoreBug',
  penalties: 'settings:system.screens.penalties',
  custom: 'settings:system.screens.custom',
  endScreen: 'settings:system.screens.endScreen',
  scoreboard: 'settings:system.screens.scoreboard',
  homeLineup: 'settings:system.screens.homeLineup',
  awayLineup: 'settings:system.screens.awayLineup',
};

export interface Props {
  // Overlay toggles go through updateMatchState (not individually undoable).
  updateMatchState: (settingsUpdated: Partial<MatchState>) => void;
  // On-air screen switches go through switchScreen, which records an undo
  // entry before applying the change.
  switchScreen: (settingsUpdated: Partial<MatchState>) => void;
  matchState: MatchState;
  customGraphics: CustomScreen[];
  matchSettings: MatchSettings;
  // Screen rotation lives here too: one key starts and stops it, and the
  // gear beside it opens the set-up.
  rotation: RotationSettings;
  updateRotation: (settings: RotationSettings) => void;
  rotating: boolean;
  startRotation: () => void;
  stopRotation: () => void;
}

export default function DisplayControlsPanel({
  updateMatchState,
  switchScreen,
  matchState,
  customGraphics,
  matchSettings,
  rotation,
  updateRotation,
  rotating,
  startRotation,
  stopRotation,
}: Props) {
  const { t } = useTranslation();
  const [rotationOpen, setRotationOpen] = useState(false);
  const customScreens = customGraphics.filter(
    (graphic) => graphic.type === undefined || graphic.type === 'screen'
  );
  const overlays = customGraphics.filter(
    (graphic) => graphic.type === 'overlay'
  );
  const canRotate =
    availableRotationEntries(rotation, matchSettings, customGraphics).length >=
    2;
  const heading = (text: string) => (
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
      {text}
    </h3>
  );

  return (
    <div>
      {heading(t('dashboard:displayControls.screens'))}
      {/* Screen switches are the most-pressed keys in a match after the
          goal keys: tall, four across, and the one on air is lit red. The
          label stays at the base size so "Away Line-up" fits on one line
          in a 1024px window. */}
      <ButtonGrid
        size="md"
        className="[&>button]:min-h-14"
        columns={4}
        selectedTone="air"
        buttons={[
          ...(Object.keys(screens) as DisplayScreen[])
            .filter((screen) => screen !== 'custom')
            .filter((screen) => isScreenOffered(screen, matchSettings))
            .map((screen) => ({
              label: t(screenLabelKeys[screen as DisplayScreen]),
              onClick: () =>
                switchScreen({
                  displayScreen: screen as DisplayScreen,
                  customScreenImageUrl: undefined,
                }),
              selected: matchState.displayScreen === screen,
            })),
        ]}
      />
      {(customScreens.length > 0 || overlays.length > 0) && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {customScreens.length > 0 && (
            <div>
              {heading(t('settings:system.screens.custom'))}
              <ButtonGrid
                size="lg"
                columns={2}
                selectedTone="air"
                buttons={customScreens.map((customScreen) => ({
                  label: customScreen.title,
                  onClick: () =>
                    switchScreen({
                      displayScreen: 'custom',
                      customScreenImageUrl: customScreen.url ?? undefined,
                    }),
                  selected:
                    matchState.displayScreen === 'custom' &&
                    matchState.customScreenImageUrl ===
                      (customScreen.url ?? undefined),
                }))}
              />
            </div>
          )}
          {overlays.length > 0 && (
            <div>
              {heading(t('dashboard:displayControls.overlays'))}
              <ButtonGrid
                size="lg"
                columns={2}
                selectedTone="air"
                buttons={overlays.map((customScreen) => {
                  const selected = (matchState.overlays || []).some(
                    (activeOverlay) =>
                      customScreenKey(activeOverlay) ===
                      customScreenKey(customScreen)
                  );
                  return {
                    label: customScreen.title,
                    onClick: () =>
                      updateMatchState({
                        overlays: selected
                          ? removeCustomScreen(matchState.overlays, customScreen)
                          : addCustomScreen(matchState.overlays, customScreen),
                      }),
                    selected,
                  };
                })}
              />
            </div>
          )}
        </div>
      )}
      {/* One key for the rotation: lit green while the display is cycling
          on its own, with the set-up (which screens, how long) behind the
          gear so the key itself stays a single tap. */}
      <div className="mt-4 flex items-stretch gap-2">
        <ActionButton
          size="lg"
          className="flex-1"
          selected={rotating}
          selectedTone="go"
          disabled={!rotating && !canRotate}
          onClick={rotating ? stopRotation : startRotation}
          icon={<ArrowPathIcon className="h-6 w-6" aria-hidden="true" />}
        >
          {rotating
            ? t('dashboard:rotation.keyRotating', {
                seconds: rotation.intervalSeconds,
              })
            : t('dashboard:rotation.title')}
        </ActionButton>
        <IconButton
          size="lg"
          className="key text-fg"
          label={t('dashboard:rotation.setUp')}
          icon={<Cog6ToothIcon className="h-6 w-6" aria-hidden="true" />}
          onClick={() => setRotationOpen(true)}
        />
      </div>
      <ScreenRotationSettings
        open={rotationOpen}
        setOpen={setRotationOpen}
        settings={rotation}
        updateSettings={updateRotation}
        matchSettings={matchSettings}
        customGraphics={customGraphics}
        rotating={rotating}
        start={startRotation}
        stop={stopRotation}
      />
    </div>
  );
}
