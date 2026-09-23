import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Club } from '../../types';

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
    <div className="col-span-full mb-4 rounded-md bg-gray-50 p-3 ring-1 ring-inset ring-gray-200">
      <label
        htmlFor={selectId}
        className="block text-sm font-medium leading-6 text-gray-900"
      >
        {t('settings:matchMenu.clubs.loadLabel')}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <select
          id={selectId}
          className="block w-full min-w-0 rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 sm:text-sm sm:leading-6"
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
        <button
          type="button"
          className="inline-flex flex-shrink-0 items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          onClick={handleSave}
          disabled={!canSave || saving}
        >
          {t('settings:matchMenu.clubs.saveAsClub')}
        </button>
      </div>
      {status === 'saved' && (
        <p className="mt-2 text-xs text-green-700" role="status">
          {t('settings:matchMenu.clubs.saved')}
        </p>
      )}
      {status === 'error' && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {t('settings:matchMenu.clubs.saveError')}
        </p>
      )}
    </div>
  );
}
