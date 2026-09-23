import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@heroicons/react/24/outline';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import Modal from '../Modal/Modal';
import ScoresTeamName from '../Screens/ScoresLayout/ScoresTeamName';
import { Club } from '../../types';

export interface Props {
  clubs: Club[];
  loadError: boolean;
  // Resolves true once the deletion is saved.
  deleteClub: (clubId: string) => Promise<boolean>;
}

// The list of saved clubs, where one can be deleted. Clubs are added from a
// team's own settings ("Save as club"), so this panel only manages them.
export default function SavedClubs({ clubs, loadError, deleteClub }: Props) {
  const { t } = useTranslation();
  const [clubToDelete, setClubToDelete] = useState<Club | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const handleDelete = async () => {
    if (!clubToDelete || deleting) return;
    setDeleting(true);
    const deleted = await deleteClub(clubToDelete.id);
    setDeleting(false);
    // A failed delete keeps the dialog open so it can be retried.
    if (deleted) {
      setClubToDelete(null);
      setDeleteError(false);
    } else {
      setDeleteError(true);
    }
  };

  return (
    <CollapsiblePanel title={t('settings:matchMenu.clubs.title')}>
      {loadError && (
        <p className="mb-2 text-sm text-red-600" role="alert">
          {t('settings:matchMenu.clubs.loadError')}
        </p>
      )}
      {clubs.length === 0 ? (
        <p className="text-sm text-gray-500">
          {t('settings:matchMenu.clubs.empty', {
            action: t('settings:matchMenu.clubs.saveAsClub'),
          })}
        </p>
      ) : (
        <ul role="list" className="divide-y divide-gray-100">
          {clubs.map((club) => (
            <li key={club.id} className="flex items-center gap-x-3 py-2">
              {club.logo ? (
                <div
                  className="h-8 w-8 flex-shrink-0 bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${club.logo}")` }}
                />
              ) : (
                <div className="h-8 w-8 flex-shrink-0" />
              )}
              <div className="flex-shrink-0 ring-1 ring-gray-300 [--base-size:0.875rem]">
                <ScoresTeamName
                  teamName={club.abbreviation}
                  textColour={club.textColour}
                  backgroundColour={club.backgroundColour}
                />
              </div>
              <span className="min-w-0 flex-grow truncate text-sm font-medium text-gray-900">
                {club.name}
              </span>
              <button
                type="button"
                className="flex-shrink-0 rounded-md p-1.5 text-gray-400 hover:text-red-600"
                aria-label={t('settings:matchMenu.clubs.deleteAria', {
                  club: club.name,
                })}
                onClick={() => {
                  setDeleteError(false);
                  setClubToDelete(club);
                }}
              >
                <TrashIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={clubToDelete !== null}
        setOpen={(open) => {
          if (!open && !deleting) setClubToDelete(null);
        }}
        title={t('settings:matchMenu.clubs.deleteModalTitle')}
        actionButtonLabel={t('settings:actions.delete')}
        icon="warning"
        action={handleDelete}
        actionDisabled={deleting}
      >
        <p className="text-sm text-gray-500">
          {t('settings:matchMenu.clubs.deleteConfirmBody', {
            club: clubToDelete?.name,
          })}
        </p>
        {deleteError && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {t('settings:matchMenu.clubs.deleteError')}
          </p>
        )}
      </Modal>
    </CollapsiblePanel>
  );
}
