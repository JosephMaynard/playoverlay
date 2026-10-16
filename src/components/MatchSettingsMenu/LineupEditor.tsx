import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@heroicons/react/24/outline';
import {
  MAX_PLAYER_NAME_LENGTH,
  MAX_PLAYER_NUMBER_LENGTH,
  MAX_PLAYERS_PER_TEAM,
  Player,
  normalisePlayerName,
  normalisePlayers,
  parsePlayerList,
} from '@playoverlay/core';
import Modal from '../Modal/Modal';

export interface Props {
  // Keeps the two teams' control ids apart (see TeamSettings).
  idPrefix: string;
  // The team's title ("Home Team"), for the controls' labels.
  team: string;
  players: Player[];
  // Undefined for an empty list, so a team without a line-up is stored
  // exactly as it was before line-ups existed.
  setPlayers: (players: Player[] | undefined) => void;
  disabled?: boolean;
}

interface RowValues {
  number: string;
  name: string;
}

const inputClassName =
  'block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700 sm:text-sm sm:leading-6';

const buttonClassName =
  'inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400';

// One player's number and name. Like the goal log's scorer field, edits are
// held as a draft and committed when focus leaves the row (or on Enter), so
// a half-typed name never reaches the on-air screens or storage. Moving
// between the row's own two fields keeps the draft.
function PlayerRow({
  idPrefix,
  index,
  team,
  values,
  isNew = false,
  disabled,
  onCommit,
  onRemove,
}: {
  idPrefix: string;
  index: number;
  team: string;
  values: RowValues;
  // A row added with "Add player" that has no player behind it yet: it
  // takes focus, and commits even untouched (so an empty one goes away).
  isNew?: boolean;
  disabled?: boolean;
  onCommit: (values: RowValues, viaEnter: boolean) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<RowValues | null>(null);
  const shown = draft ?? values;
  const rowId = `${idPrefix}-player-${isNew ? 'new' : index}`;
  const label = { team, n: index + 1 };

  const commit = (viaEnter: boolean) => {
    if (draft === null && !isNew) return;
    setDraft(null);
    onCommit(shown, viaEnter);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit(true);
    }
  };

  return (
    <li
      className="flex items-center gap-2"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          commit(false);
        }
      }}
    >
      <input
        type="text"
        id={`${rowId}-number`}
        aria-label={t('settings:matchMenu.lineup.numberLabel', label)}
        placeholder={t('settings:matchMenu.lineup.numberPlaceholder')}
        maxLength={MAX_PLAYER_NUMBER_LENGTH}
        className={`${inputClassName} w-[calc(3ch+1.5rem)] flex-shrink-0 px-2 text-center tabular-nums`}
        value={shown.number}
        disabled={disabled}
        onChange={(event) => setDraft({ ...shown, number: event.target.value })}
        onKeyDown={handleKeyDown}
      />
      <input
        type="text"
        id={`${rowId}-name`}
        aria-label={t('settings:matchMenu.lineup.nameLabel', label)}
        placeholder={t('settings:matchMenu.lineup.namePlaceholder')}
        maxLength={MAX_PLAYER_NAME_LENGTH}
        className={`${inputClassName} w-full min-w-0`}
        value={shown.name}
        disabled={disabled}
        // A row the operator has just asked for is ready to type into.
        autoFocus={isNew}
        onChange={(event) => setDraft({ ...shown, name: event.target.value })}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className="flex-shrink-0 rounded-md p-1.5 text-gray-400 hover:text-red-600 disabled:cursor-not-allowed disabled:hover:text-gray-400"
        aria-label={t('settings:matchMenu.lineup.removeAria', {
          player:
            normalisePlayerName(shown.name) ||
            t('settings:matchMenu.lineup.unnamedPlayer', label),
        })}
        disabled={disabled}
        onClick={onRemove}
      >
        <TrashIcon className="h-5 w-5" aria-hidden="true" />
      </button>
    </li>
  );
}

// The Line-up section of a team's settings: one row per player, plus "Add
// player" and "Paste a list". An empty list shows only the two buttons and a
// line of help, so the panel is barely taller than it was without line-ups.
export default function LineupEditor({
  idPrefix,
  team,
  players,
  setPlayers,
  disabled,
}: Props) {
  const { t } = useTranslation();
  // The row "Add player" opened, if any. Each gets a fresh id so a commit
  // from a row that has already been replaced (Enter commits, and the row
  // can still report a blur as it unmounts) is recognised and ignored.
  const [newRowId, setNewRowId] = useState<number | null>(null);
  const newRowIdRef = useRef<number | null>(null);
  const nextRowId = useRef(0);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const headingId = `${idPrefix}-lineup-heading`;
  const pasteId = `${idPrefix}-lineup-paste`;
  const atCap = players.length >= MAX_PLAYERS_PER_TEAM;

  const openNewRow = (open: boolean) => {
    const id = open ? nextRowId.current++ : null;
    newRowIdRef.current = id;
    setNewRowId(id);
  };

  const commitPlayers = (nextPlayers: Player[]) => {
    const normalised = normalisePlayers(nextPlayers);
    setPlayers(normalised.length > 0 ? normalised : undefined);
  };

  const updatePlayer = (index: number, values: RowValues) => {
    // A name cleared by mistake keeps the player; the bin button removes.
    const [edited] = normalisePlayers([values]);
    if (!edited) return;
    const player = players[index];
    if (player.name === edited.name && player.number === edited.number) return;
    commitPlayers(
      players.map((entry, position) => (position === index ? edited : entry))
    );
  };

  const addPlayer = (rowId: number, values: RowValues, viaEnter: boolean) => {
    if (newRowIdRef.current !== rowId) return;
    if (normalisePlayerName(values.name) === '') {
      openNewRow(false);
      return;
    }
    const nextPlayers = [
      ...players,
      { name: values.name, number: values.number },
    ];
    commitPlayers(nextPlayers);
    // Enter on a new row moves straight on to the next, so a squad can be
    // typed without reaching for the mouse.
    openNewRow(viaEnter && nextPlayers.length < MAX_PLAYERS_PER_TEAM);
  };

  const pastePlayers = () => {
    commitPlayers([...players, ...parsePlayerList(pasteText)]);
    setPasteOpen(false);
    setPasteText('');
  };

  return (
    <section className="col-span-full mb-4" aria-labelledby={headingId}>
      <h3
        id={headingId}
        className="block text-sm font-medium leading-6 text-gray-900"
      >
        {t('settings:matchMenu.lineup.title')}
      </h3>
      {players.length === 0 && newRowId === null && (
        <p className="mt-1 text-sm text-gray-500">
          {t('settings:matchMenu.lineup.empty')}
        </p>
      )}
      {(players.length > 0 || newRowId !== null) && (
        <ul role="list" className="mt-2 space-y-2">
          {players.map((player, index) => (
            <PlayerRow
              // Rows are positions in the list: only the focused row can hold
              // a draft, and leaving it commits before anything else moves.
              key={index}
              idPrefix={idPrefix}
              index={index}
              team={team}
              values={{ number: player.number ?? '', name: player.name }}
              disabled={disabled}
              onCommit={(values) => updatePlayer(index, values)}
              onRemove={() =>
                commitPlayers(
                  players.filter((_, position) => position !== index)
                )
              }
            />
          ))}
          {newRowId !== null && (
            <PlayerRow
              key={`new-${newRowId}`}
              idPrefix={idPrefix}
              index={players.length}
              team={team}
              values={{ number: '', name: '' }}
              isNew
              disabled={disabled}
              onCommit={(values, viaEnter) =>
                addPlayer(newRowId, values, viaEnter)
              }
              onRemove={() => openNewRow(false)}
            />
          )}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={buttonClassName}
          disabled={disabled || atCap}
          onClick={() => openNewRow(true)}
        >
          {t('settings:matchMenu.lineup.addPlayer')}
        </button>
        <button
          type="button"
          className={buttonClassName}
          disabled={disabled || atCap}
          onClick={() => setPasteOpen(true)}
        >
          {t('settings:matchMenu.lineup.pasteList')}
        </button>
        {players.length > 0 && (
          <span className="text-sm text-gray-500">
            {t('settings:matchMenu.lineup.count', { count: players.length })} (
            {t('settings:matchMenu.lineup.cap', { max: MAX_PLAYERS_PER_TEAM })})
          </span>
        )}
      </div>
      <Modal
        open={pasteOpen}
        setOpen={setPasteOpen}
        title={t('settings:matchMenu.lineup.pasteModalTitle', { team })}
        actionButtonLabel={t('settings:matchMenu.lineup.pasteAction')}
        actionButtonColor="indigo"
        action={pastePlayers}
        actionDisabled={pasteText.trim() === ''}
      >
        <label htmlFor={pasteId} className="block text-sm text-gray-500">
          {t('settings:matchMenu.lineup.pasteHint')}
        </label>
        <textarea
          id={pasteId}
          rows={10}
          className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          value={pasteText}
          onChange={(event) => setPasteText(event.target.value)}
        />
      </Modal>
    </section>
  );
}
