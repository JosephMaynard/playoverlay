import { useEffect, useState } from 'react';
import SideMenu from '../SideMenu/SideMenu';
import Modal from '../Modal/Modal';
import { MatchSettings } from '../../zodSchemas';

export interface Props {
  open: boolean;
  setOpen: () => void;
  matchSettings: MatchSettings;
  setMatchSettings: (matchSettings: MatchSettings) => void;
}

export default function SavedMatchSettingsMenu({ open, setOpen }: Props) {
  const [
    savedMatchSettingsScreenToDelete,
    setSavedMatchSettingsScreenToDelete,
  ] = useState<MatchSettings | null>(null);
  const [
    showSaveCurrentMatchSettingsModal,
    setShowSaveCurrentMatchSettingsModal,
  ] = useState(false);
  const [savedMatchSettings, setSavedMatchSettings] = useState<MatchSettings[]>(
    []
  );

  const fetchSavedMatchSettings = async () => {
    try {
      const storedMatchSettings =
        await window?.electronAPI?.getSavedMatchSettings();
      setSavedMatchSettings(storedMatchSettings || []);
    } catch (error) {
      console.error('Failed to fetch saved match settings:', error);
    }
  };

  useEffect(() => {
    fetchSavedMatchSettings();
  }, []);

  return (
    <SideMenu open={open} setOpen={setOpen} title="Saved Match Settings">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto" />
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => setShowSaveCurrentMatchSettingsModal(true)}
          >
            Save Current Match Settings
          </button>
        </div>
      </div>
      <Modal
        open={!!savedMatchSettingsScreenToDelete}
        setOpen={() => setSavedMatchSettingsScreenToDelete(null)}
        title="Delete custom screen?"
        actionButtonLabel="Delete custom screen"
        icon="warning"
        action={() => {
          // window?.electronAPI?.deleteImage(customScreenToDelete.filePath);
          // setShowAddConfirmDeleteModal(false);
        }}
      >
        <p className="text-sm text-gray-500">
          Are you sure you want to delete the saved match settings "
          {savedMatchSettingsScreenToDelete?.saveTitle}"?
        </p>
      </Modal>
    </SideMenu>
  );
}
