import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import Modal from '../Modal/Modal';
import { MatchSettings, defaultMatchSettings } from '@playoverlay/core';
import WideModal from '../Modal/WideModal';
import Empty from './Empty';
import { nanoid } from 'nanoid';
import { ArrowUpOnSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import ActionButton from '../ui/ActionButton';
import {
  errorTextClassName,
  inputClassName,
  labelClassName,
} from '../ui/fields';

export interface Props {
  matchSettings: MatchSettings;
  replaceMatchSettings: (matchSettings: MatchSettings) => void;
}

export default function SavedMatchSettings({
  matchSettings,
  replaceMatchSettings,
}: Props) {
  const { t } = useTranslation();
  const [savedMatchSettingsToDelete, setSavedMatchSettingsToDelete] =
    useState<MatchSettings | null>(null);
  const [savedMatchSettingsToRestore, setSavedMatchSettingsToRestore] =
    useState<MatchSettings | null>(null);
  const [savedMatchSettings, setSavedMatchSettings] = useState<MatchSettings[]>(
    []
  );
  const [modal, setModal] = useState<
    null | 'save-current-match-settings' | 'show-saved-match-settings'
  >(null);
  const [savedMatchName, setSavedMatchName] = useState('');
  // Save and delete keep their dialog open until the main process answers,
  // so a failed write can be retried without retyping anything. The ref is
  // the synchronous double-click guard; the state drives the disabled button.
  const [isWriting, setIsWriting] = useState(false);
  const writeInFlight = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchSavedMatchSettings = async () => {
    try {
      const storedMatchSettings =
        await window?.electronAPI?.getSavedMatchSettings();
      // Rows saved before saveId existed get one assigned here, so
      // delete-by-saveId can't remove multiple rows and React keys are stable.
      setSavedMatchSettings(
        (storedMatchSettings ?? []).map((settings) =>
          settings.saveId ? settings : { ...settings, saveId: nanoid() }
        )
      );
    } catch (error) {
      // The list just stays as it was; the write that preceded this (if
      // any) has already been confirmed.
      console.error('Failed to load saved match settings:', error);
    }
  };

  // Writes the whole saved-fixtures list and resolves true only once the
  // main process confirms it. A missing API or response counts as a failure
  // rather than a silent success.
  const writeSavedMatchSettings = async (
    updatedList: MatchSettings[]
  ): Promise<boolean> => {
    try {
      const response =
        await window?.electronAPI?.setSavedMatchSettings(updatedList);
      if (response?.success) return true;
      console.error('Failed to write saved match settings:', response?.error);
    } catch (error) {
      console.error('Failed to write saved match settings:', error);
    }
    return false;
  };

  const runWrite = async (write: () => Promise<void>) => {
    if (writeInFlight.current) return;
    writeInFlight.current = true;
    setIsWriting(true);
    try {
      await write();
    } finally {
      writeInFlight.current = false;
      setIsWriting(false);
    }
  };

  const handleSave = () =>
    runWrite(async () => {
      setSaveError(null);
      const saved = await writeSavedMatchSettings([
        ...savedMatchSettings,
        {
          ...matchSettings,
          saveTitle: savedMatchName,
          saveDate: new Date().toISOString(),
          saveId: nanoid(),
        },
      ]);
      if (!saved) {
        setSaveError(t('settings:matchMenu.saved.saveError'));
        return;
      }
      setModal(null);
      await fetchSavedMatchSettings();
    });

  const handleDelete = () =>
    runWrite(async () => {
      if (!savedMatchSettingsToDelete) {
        return;
      }
      setDeleteError(null);
      const deleted = await writeSavedMatchSettings(
        savedMatchSettings.filter(
          (matchSettings) =>
            matchSettings.saveId !== savedMatchSettingsToDelete.saveId
        )
      );
      if (!deleted) {
        setDeleteError(t('settings:matchMenu.saved.deleteError'));
        return;
      }
      setSavedMatchSettingsToDelete(null);
      await fetchSavedMatchSettings();
    });

  // Suggest a name from the current teams each time the save dialog opens,
  // not on every settings change, so a name the operator has typed survives
  // while the dialog is open (including across a failed save and retry).
  const openSaveDialog = () => {
    setSavedMatchName(
      t('settings:matchMenu.saved.defaultName', {
        home: matchSettings.homeTeamNameFull,
        away: matchSettings.awayTeamNameFull,
      })
    );
    setSaveError(null);
    setModal('save-current-match-settings');
  };

  useEffect(() => {
    fetchSavedMatchSettings();
  }, []);

  return (
    <>
      <CollapsiblePanel title={t('settings:matchMenu.saved.title')}>
        <div className="grid grid-cols-2 gap-3">
          <ActionButton variant="primary" size="md" onClick={openSaveDialog}>
            {t('settings:matchMenu.saved.saveCurrent')}
          </ActionButton>
          <ActionButton
            size="md"
            onClick={() => setModal('show-saved-match-settings')}
          >
            {t('settings:matchMenu.saved.openSaved')}
          </ActionButton>
        </div>
      </CollapsiblePanel>
      <WideModal
        open={modal === 'show-saved-match-settings'}
        setOpen={() => setModal(null)}
        title={t('settings:matchMenu.saved.openSaved')}
      >
        {savedMatchSettings.length === 0 ? (
          <Empty
            title={t('settings:matchMenu.saved.emptyTitle')}
            description={t('settings:matchMenu.saved.emptyDescription', {
              action: t('settings:matchMenu.saved.saveCurrent'),
            })}
          />
        ) : (
          <ul role="list" className="divide-y divide-line">
            {savedMatchSettings.map((savedMatchSetting) => (
              <li
                key={savedMatchSetting.saveId}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 flex-auto grow flex-col items-start justify-center">
                  <p className="max-w-full truncate text-base font-semibold text-fg">
                    {savedMatchSetting.saveTitle}
                  </p>
                  {savedMatchSetting.saveDate && (
                    <p className="mt-0.5 text-sm text-muted">
                      {t('settings:matchMenu.saved.savedAt', {
                        date: new Date(
                          savedMatchSetting.saveDate
                        ).toLocaleString(),
                      })}
                    </p>
                  )}
                </div>

                <div className="flex flex-shrink-0 items-center gap-3">
                  <ActionButton
                    variant="primary"
                    size="md"
                    icon={
                      <ArrowUpOnSquareIcon
                        className="-ml-0.5 h-5 w-5"
                        aria-hidden="true"
                      />
                    }
                    onClick={() =>
                      setSavedMatchSettingsToRestore(savedMatchSetting)
                    }
                  >
                    {t('settings:matchMenu.saved.restore')}
                  </ActionButton>
                  <ActionButton
                    variant="danger"
                    size="md"
                    icon={
                      <TrashIcon
                        className="-ml-0.5 h-5 w-5"
                        aria-hidden="true"
                      />
                    }
                    onClick={() => {
                      setDeleteError(null);
                      setSavedMatchSettingsToDelete(savedMatchSetting);
                    }}
                  >
                    {t('settings:actions.delete')}
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </WideModal>
      <Modal
        open={!!savedMatchSettingsToDelete}
        setOpen={() => setSavedMatchSettingsToDelete(null)}
        title={t('settings:matchMenu.saved.deleteModalTitle')}
        actionButtonLabel={t('settings:actions.delete')}
        icon="warning"
        action={handleDelete}
        actionDisabled={isWriting}
      >
        <p className="text-sm text-muted">
          {t('settings:matchMenu.saved.deleteConfirmBody', {
            title: savedMatchSettingsToDelete?.saveTitle,
          })}
        </p>
        {deleteError && (
          <p role="alert" className={errorTextClassName}>
            {deleteError}
          </p>
        )}
      </Modal>
      <Modal
        open={!!savedMatchSettingsToRestore}
        setOpen={() => setSavedMatchSettingsToRestore(null)}
        title={t('settings:matchMenu.saved.restoreModalTitle')}
        actionButtonLabel={t('settings:matchMenu.saved.restore')}
        actionButtonColor="green"
        icon="warning"
        action={() => {
          if (savedMatchSettingsToRestore) {
            // Restore as a replace against the defaults (not a merge into the
            // current settings, so an optional field the fixture omits, like
            // a logo or venue, doesn't survive from the previous one), and
            // keep the save-slot metadata out of the live match settings.
            const restoredSettings = {
              ...defaultMatchSettings,
              ...savedMatchSettingsToRestore,
            };
            delete restoredSettings.saveTitle;
            delete restoredSettings.saveDate;
            delete restoredSettings.saveId;
            replaceMatchSettings(restoredSettings);
          }
          setSavedMatchSettingsToRestore(null);
          setModal(null);
        }}
      >
        <p className="text-sm text-muted">
          {t('settings:matchMenu.saved.restoreConfirmBody')}
        </p>
      </Modal>
      <Modal
        open={modal === 'save-current-match-settings'}
        setOpen={() => setModal(null)}
        title={t('settings:matchMenu.saved.saveModalTitle')}
        actionButtonLabel={t('settings:actions.save')}
        actionButtonColor="green"
        icon="playoverlay-logo"
        action={handleSave}
        actionDisabled={isWriting}
      >
        <div className="my-4">
          <label htmlFor="saved-match-settings-name" className={labelClassName}>
            {t('settings:matchMenu.saved.nameLabel')}
          </label>
          <div className="mt-2">
            <input
              type="text"
              id="saved-match-settings-name"
              className={inputClassName}
              value={savedMatchName}
              onChange={(e) => setSavedMatchName(e.target.value)}
            />
          </div>
          {saveError && (
            <p role="alert" className={errorTextClassName}>
              {saveError}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
