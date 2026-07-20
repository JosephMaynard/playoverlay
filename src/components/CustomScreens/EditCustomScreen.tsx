import { useTranslation } from 'react-i18next';
import { DisplayScreen, screens } from '../../constants';
import { CustomScreen } from '../../types';
import { insertValue, removeValue } from '../../utils';
import Modal from '../Modal/Modal';

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
};

export interface Props {
  customScreenToEdit: CustomScreen | null;
  setCustomScreenToEdit: (customScreen: CustomScreen | null) => void;
  handleSaveChanges: () => void;
  handleOnChange: (change: Partial<CustomScreen>) => void;
  keyColour: string;
}

export default function EditCustomScreen({
  customScreenToEdit,
  setCustomScreenToEdit,
  handleSaveChanges,
  handleOnChange,
  keyColour,
}: Props) {
  const { t } = useTranslation();
  if (customScreenToEdit === null) return null;

  // "All Screens" is checked when the overlay covers every currently-known
  // screen. Overlays saved before a new screen key was added (e.g.
  // `scoreboard`) may also contain only old ids, and strict list equality
  // would never match them once the known-screens list grows — so tolerate
  // extra unknown ids and only require the current screens to be present.
  const overlayLinks = customScreenToEdit.overlayLinks || [];
  const allScreensChecked = (Object.keys(screens) as DisplayScreen[]).every(
    (screen) => overlayLinks.includes(screen)
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
      title={t('settings:customScreens.editModal.title')}
      icon="edit"
    >
      <div
        style={{
          backgroundImage: `url("${customScreenToEdit?.url}")`,
          backgroundColor: keyColour,
        }}
        className="my-8 aspect-video w-80 rounded-sm bg-contain bg-center bg-no-repeat shadow-sm"
      />
      <div className="my-4">
        <label
          htmlFor="edit-custom-screen-title"
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          {t('settings:customScreens.uploader.titleLabel')}
        </label>
        <div className="mt-2">
          <input
            type="text"
            id="edit-custom-screen-title"
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={customScreenToEdit?.title}
            onChange={(e) => handleOnChange({ title: e.target.value })}
          />
        </div>
      </div>
      <fieldset className="mt-6">
        <legend className="text-sm font-semibold leading-6 text-gray-900">
          {t('settings:customScreens.editModal.type')}
        </legend>
        <div className="mt-2 space-y-2">
          <div className="flex items-center">
            <input
              checked={
                customScreenToEdit?.type === 'screen' ||
                customScreenToEdit?.type === undefined
              }
              id="custom-graphic-type-screen"
              name="custom-graphic-type"
              type="radio"
              value="screen"
              className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
              onChange={(e) => {
                handleOnChange({
                  type: e.target.value as 'screen' | 'overlay',
                  overlayLinks: [],
                });
              }}
            />
            <label
              htmlFor="custom-graphic-type-screen"
              className="ml-3 block text-sm font-medium leading-6 text-gray-900"
            >
              {t('settings:customScreens.typeScreen')}
            </label>
          </div>
          <div className="flex items-center">
            <input
              checked={customScreenToEdit?.type === 'overlay'}
              id="custom-graphic-type-overlay"
              name="custom-graphic-type"
              type="radio"
              value="overlay"
              className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
              onChange={(e) => {
                handleOnChange({
                  type: e.target.value as 'screen' | 'overlay',
                });
              }}
            />
            <label
              htmlFor="custom-graphic-type-overlay"
              className="ml-3 block text-sm font-medium leading-6 text-gray-900"
            >
              {t('settings:customScreens.typeOverlay')}
            </label>
          </div>
        </div>
      </fieldset>
      {customScreenToEdit?.type === 'overlay' && (
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold leading-6 text-gray-900">
            {t('settings:customScreens.editModal.overlayScreens')}
          </legend>
          <div className="mt-2 space-y-2">
            <div className="relative flex items-start">
              <div className="flex h-6 items-center">
                <input
                  id="all"
                  name="all"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  checked={allScreensChecked}
                  onChange={(e) => {
                    handleOnChange({
                      overlayLinks: e.target.checked
                        ? (Object.keys(screens) as DisplayScreen[])
                        : [],
                    });
                  }}
                />
              </div>
              <div className="ml-3 text-sm leading-6">
                <label htmlFor="all" className="font-medium text-gray-900">
                  {t('settings:customScreens.editModal.allScreens')}
                </label>
              </div>
            </div>
            {Object.keys(screens).map((screen: DisplayScreen) => (
              <div className="relative flex items-start" key={screen}>
                <div className="flex h-6 items-center">
                  <input
                    id={screen}
                    name={screen}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
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
                </div>
                <div className="ml-3 text-sm leading-6">
                  <label htmlFor={screen} className="font-medium text-gray-900">
                    {t(screenLabelKeys[screen as DisplayScreen])}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </fieldset>
      )}
    </Modal>
  );
}
