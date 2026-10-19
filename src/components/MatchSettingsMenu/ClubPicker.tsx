import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Club, classNames } from '@playoverlay/core';
import ActionButton from '../ui/ActionButton';
import {
  errorTextClassName,
  labelClassName,
  selectClassName,
} from '../ui/fields';

export interface Props {
  // Used to keep the two teams' control ids apart.
  idPrefix: string;
  clubs: Club[];
  loadClub: (club: Club) => void;
  // Resolves true once the club is saved.
  saveAsClub: () => Promise<boolean>;
  canSave: boolean;
}

// The Club presets controls at the top of a team's settings: load a saved
// club into this slot, or save what is in it as a club for next time.
export default function ClubPicker({
  idPrefix,
  clubs,
  loadClub,
  saveAsClub,
  canSave,
}: Props) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'saved' | 'error' | null>(null);
  const selectId = `${idPrefix}-club`;

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setStatus(null);
    const saved = await saveAsClub();
    setSaving(false);
    setStatus(saved ? 'saved' : 'error');
  };

  return (
    <div className="col-span-full rounded-xl bg-surface-2 p-3 ring-1 ring-inset ring-line">
      <label htmlFor={selectId} className={labelClassName}>
        {t('settings:matchMenu.clubs.loadLabel')}
      </label>
      <div className="mt-2 flex items-center gap-3">
        <select
          id={selectId}
          className={classNames(selectClassName, 'min-w-0')}
          value=""
          disabled={clubs.length === 0}
          onChange={(event) => {
            const club = clubs.find((entry) => entry.id === event.target.value);
            if (club) {
              setStatus(null);
              loadClub(club);
            }
          }}
        >
          <option value="">
            {clubs.length === 0
              ? t('settings:matchMenu.clubs.noneSaved')
              : t('settings:matchMenu.clubs.placeholder')}
          </option>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.abbreviation
                ? `${club.name} (${club.abbreviation})`
                : club.name}
            </option>
          ))}
        </select>
        <ActionButton
          size="md"
          className="flex-shrink-0"
          onClick={handleSave}
          disabled={!canSave || saving}
        >
          {t('settings:matchMenu.clubs.saveAsClub')}
        </ActionButton>
      </div>
      {status === 'saved' && (
        <p className="mt-2 text-sm font-medium text-live-ink" role="status">
          {t('settings:matchMenu.clubs.saved')}
        </p>
      )}
      {status === 'error' && (
        <p className={errorTextClassName} role="alert">
          {t('settings:matchMenu.clubs.saveError')}
        </p>
      )}
    </div>
  );
}
