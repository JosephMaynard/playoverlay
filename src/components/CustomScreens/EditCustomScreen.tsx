import { useTranslation } from 'react-i18next';
import {
  DisplayScreen,
  screens,
  CustomScreen,
  MatchSettings,
  hasLineup,
  insertValue,
  lineupScreenTeam,
  removeValue,
} from '@playoverlay/core';
import Modal from '../Modal/Modal';
import {
  checkboxClassName,
  errorTextClassName,
  inputClassName,
  labelClassName,
  radioClassName,
  sectionHeadingClassName,
} from '../ui/fields';

// A radio or checkbox row where the whole 48px row is the label, so the
// tap does not have to land on the 24px box itself.
const choiceRowClassName =
  'flex min-h-12 cursor-pointer items-center gap-3 rounded px-2 text-base font-medium text-fg hover:bg-surface-2';

// Same local i18n key map as SystemSettingsMenu's Stream Deck screen buttons
// (duplicated rather than shared: `screens` is also used by
// DisplayControlsPanel outside this area's ownership).
const screenLabelKeys: Record<DisplayScreen, string> = {
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
  customScreenToEdit: CustomScreen | null;
  setCustomScreenToEdit: (customScreen: CustomScreen | null) => void;
  handleSaveChanges: () => void;
  handleOnChange: (change: Partial<CustomScreen>) => void;
  keyColour: string;
  // Shown under the form when the last save failed; the draft stays as
  // typed so the operator can retry.
  saveError?: string | null;
  // True while a save is in flight, so Save can't be clicked twice.
  isSaving?: boolean;
  // Decides whether the line-up screens are listed (see linkableScreens).
  matchSettings?: MatchSettings;
}

// The screens an overlay can be linked to. A line-up screen is only listed
// while its team has players, as on the dashboard, so for a match without
// line-ups the list (and what "All Screens" stores) is exactly what it was
// before line-ups existed. Everything else is always listed.
function linkableScreens(matchSettings?: MatchSettings): DisplayScreen[] {
  return (Object.keys(screens) as DisplayScreen[]).filter((screen) => {
    const team = lineupScreenTeam(screen);
    return (
      team === undefined ||
      (matchSettings !== undefined && hasLineup(matchSettings, team))
    );
  });
}

export default function EditCustomScreen({
  customScreenToEdit,
  setCustomScreenToEdit,
  handleSaveChanges,
  handleOnChange,
  keyColour,
  saveError = null,
  isSaving = false,
  matchSettings,
}: Props) {
  const { t } = useTranslation();
  if (customScreenToEdit === null) return null;

  // "All Screens" is checked when the overlay covers every currently-known
  // screen. Overlays saved before a new screen key was added (e.g.
  // `scoreboard`) may also contain only old ids, and strict list equality
  // would never match them once the known-screens list grows, so tolerate
  // extra unknown ids and only require the current screens to be present.
  const overlayLinks = customScreenToEdit.overlayLinks || [];
  const listedScreens = linkableScreens(matchSettings);
  const allScreensChecked = listedScreens.every((screen) =>
    overlayLinks.includes(screen)
  );

  return (
    <Modal
      open={customScreenToEdit !== null}
      setOpen={() => setCustomScreenToEdit(null)}
      actionButtonLabel={t('settings:customScreens.editModal.saveChanges')}
      actionButtonColor="green"
      action={() => {
        handleSaveChanges();
      }}
      actionDisabled={isSaving}
      title={t('settings:customScreens.editModal.title')}
      icon="edit"
    >
      <div
        style={{
          backgroundImage: `url("${customScreenToEdit?.url}")`,
          backgroundColor: keyColour,
        }}
        className="my-6 aspect-video w-full max-w-sm rounded bg-contain bg-center bg-no-repeat ring-1 ring-inset ring-line"
      />
      <div className="space-y-6">
        <div>
          <label htmlFor="edit-custom-screen-title" className={labelClassName}>
            {t('settings:customScreens.uploader.titleLabel')}
          </label>
          <div className="mt-2">
            <input
              type="text"
              id="edit-custom-screen-title"
              className={inputClassName}
              value={customScreenToEdit?.title}
              onChange={(e) => handleOnChange({ title: e.target.value })}
            />
          </div>
        </div>
        <fieldset>
          <legend className={sectionHeadingClassName}>
            {t('settings:customScreens.editModal.type')}
          </legend>
          <div className="mt-2 space-y-1">
            <label
              htmlFor="custom-graphic-type-screen"
              className={choiceRowClassName}
            >
              <input
                checked={
                  customScreenToEdit?.type === 'screen' ||
                  customScreenToEdit?.type === undefined
                }
                id="custom-graphic-type-screen"
                name="custom-graphic-type"
                type="radio"
                value="screen"
                className={radioClassName}
                onChange={(e) => {
                  handleOnChange({
                    type: e.target.value as 'screen' | 'overlay',
                    overlayLinks: [],
                  });
                }}
              />
              {t('settings:customScreens.typeScreen')}
            </label>
            <label
              htmlFor="custom-graphic-type-overlay"
              className={choiceRowClassName}
            >
              <input
                checked={customScreenToEdit?.type === 'overlay'}
                id="custom-graphic-type-overlay"
                name="custom-graphic-type"
                type="radio"
                value="overlay"
                className={radioClassName}
                onChange={(e) => {
                  handleOnChange({
                    type: e.target.value as 'screen' | 'overlay',
                  });
                }}
              />
              {t('settings:customScreens.typeOverlay')}
            </label>
          </div>
        </fieldset>
        {customScreenToEdit?.type === 'overlay' && (
          <fieldset>
            <legend className={sectionHeadingClassName}>
              {t('settings:customScreens.editModal.overlayScreens')}
            </legend>
            <div className="mt-2 space-y-1">
              <label htmlFor="all" className={choiceRowClassName}>
                <input
                  id="all"
                  name="all"
                  type="checkbox"
                  className={checkboxClassName}
                  checked={allScreensChecked}
                  onChange={(e) => {
                    handleOnChange({
                      overlayLinks: e.target.checked ? listedScreens : [],
                    });
                  }}
                />
                {t('settings:customScreens.editModal.allScreens')}
              </label>
              {listedScreens.map((screen) => (
                <label
                  htmlFor={screen}
                  key={screen}
                  className={choiceRowClassName}
                >
                  <input
                    id={screen}
                    name={screen}
                    type="checkbox"
                    className={checkboxClassName}
                    checked={(customScreenToEdit?.overlayLinks || []).includes(
                      screen
                    )}
                    onChange={(e) => {
                      handleOnChange({
                        overlayLinks: e.target.checked
                          ? (insertValue(
                              customScreenToEdit.overlayLinks || [],
                              screen
                            ) as DisplayScreen[])
                          : (removeValue(
                              customScreenToEdit.overlayLinks || [],
                              screen
                            ) as DisplayScreen[]),
                      });
                    }}
                  />
                  {t(screenLabelKeys[screen as DisplayScreen])}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>
      {saveError && (
        <p role="alert" className={errorTextClassName}>
          {saveError}
        </p>
      )}
    </Modal>
  );
}
