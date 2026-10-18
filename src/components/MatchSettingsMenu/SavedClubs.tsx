import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@heroicons/react/24/outline';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import Modal from '../Modal/Modal';
import { ScoresTeamName } from '@playoverlay/screens';
import { Club, classNames } from '@playoverlay/core';
import IconButton from '../ui/IconButton';
import { errorTextClassName } from '../ui/fields';

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
        <p className={classNames(errorTextClassName, 'mb-3')} role="alert">
          {t('settings:matchMenu.clubs.loadError')}
        </p>
      )}
      {clubs.length === 0 ? (
        <p className="text-sm text-muted">
          {t('settings:matchMenu.clubs.empty', {
            action: t('settings:matchMenu.clubs.saveAsClub'),
          })}
        </p>
      ) : (
        <ul role="list" className="-my-1 divide-y divide-line">
          {clubs.map((club) => (
            <li key={club.id} className="flex min-h-14 items-center gap-3 py-1">
              {club.logo ? (
                <div
                  className="h-10 w-10 flex-shrink-0 bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${club.logo}")` }}
                />
              ) : (
                <div className="h-10 w-10 flex-shrink-0" />
              )}
              <div className="flex-shrink-0 ring-1 ring-line [--base-size:0.875rem]">
                <ScoresTeamName
                  teamName={club.abbreviation}
                  textColour={club.textColour}
                  backgroundColour={club.backgroundColour}
                />
              </div>
              <span className="min-w-0 flex-grow truncate text-base font-medium text-fg">
                {club.name}
              </span>
              {club.players && club.players.length > 0 && (
                <span className="flex-shrink-0 text-sm text-muted">
                  {t('settings:matchMenu.clubs.playerCount', {
                    count: club.players.length,
                  })}
                </span>
              )}
              <IconButton
                tone="danger"
                className="flex-shrink-0"
                label={t('settings:matchMenu.clubs.deleteAria', {
                  club: club.name,
                })}
                icon={<TrashIcon className="h-6 w-6" aria-hidden="true" />}
                onClick={() => {
                  setDeleteError(false);
                  setClubToDelete(club);
                }}
              />
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
        <p className="text-sm text-muted">
          {t('settings:matchMenu.clubs.deleteConfirmBody', {
            club: clubToDelete?.name,
          })}
        </p>
        {deleteError && (
          <p className={errorTextClassName} role="alert">
            {t('settings:matchMenu.clubs.deleteError')}
          </p>
        )}
      </Modal>
    </CollapsiblePanel>
  );
}
