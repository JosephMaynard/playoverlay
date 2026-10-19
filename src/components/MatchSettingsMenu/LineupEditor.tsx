import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@heroicons/react/24/outline';
import {
  MAX_PLAYER_NAME_LENGTH,
  MAX_PLAYER_NUMBER_LENGTH,
  MAX_PLAYERS_PER_TEAM,
  Player,
  isStarter,
  normalisePlayerName,
  normalisePlayers,
  classNames,
  parsePlayerList,
} from '@playoverlay/core';
import Modal from '../Modal/Modal';
import ActionButton from '../ui/ActionButton';
import IconButton from '../ui/IconButton';
import {
  checkboxClassName,
  compactInputClassName,
  helpTextClassName,
  inputClassName,
  sectionHeadingClassName,
  textareaClassName,
} from '../ui/fields';

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
  starting: boolean;
}

// One player's number, name and whether they start. Like the goal log's
// scorer field, typed edits are held as a draft and committed when focus
// leaves the row (or on Enter), so a half-typed name never reaches the
// on-air screens or storage. Moving between the row's own fields keeps the
// draft. The Starts box is a click, not typing, so it commits the row at
// once.
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

  const setStarting = (starting: boolean) => {
    const next = { ...shown, starting };
    // A new row has no player to commit to yet; its flag travels with the
    // draft until the name is committed.
    if (isNew) {
      setDraft(next);
      return;
    }
    setDraft(null);
    onCommit(next, false);
  };

  const playerLabel =
    normalisePlayerName(shown.name) ||
    t('settings:matchMenu.lineup.unnamedPlayer', label);

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
        className={classNames(
          compactInputClassName,
          'w-[calc(3ch+1.5rem)] flex-shrink-0 text-center tabular-nums'
        )}
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
        className={classNames(inputClassName, 'min-w-0')}
        value={shown.name}
        disabled={disabled}
        // A row the operator has just asked for is ready to type into.
        autoFocus={isNew}
        onChange={(event) => setDraft({ ...shown, name: event.target.value })}
        onKeyDown={handleKeyDown}
      />
      <input
        type="checkbox"
        id={`${rowId}-starts`}
        aria-label={t('settings:matchMenu.lineup.startsLabel', {
          player: playerLabel,
        })}
        className={classNames(checkboxClassName, 'flex-shrink-0')}
        checked={shown.starting}
        disabled={disabled}
        onChange={(event) => setStarting(event.target.checked)}
      />
      <IconButton
        tone="danger"
        className="flex-shrink-0"
        label={t('settings:matchMenu.lineup.removeAria', {
          player: playerLabel,
        })}
        icon={<TrashIcon className="h-6 w-6" aria-hidden="true" />}
        disabled={disabled}
        onClick={onRemove}
      />
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
  const startingCount = players.filter(isStarter).length;
  const benchCount = players.length - startingCount;

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
    if (
      player.name === edited.name &&
      player.number === edited.number &&
      isStarter(player) === isStarter(edited)
    ) {
      return;
    }
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
      { name: values.name, number: values.number, starting: values.starting },
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
    <section className="col-span-full" aria-labelledby={headingId}>
      <h3 id={headingId} className={sectionHeadingClassName}>
        {t('settings:matchMenu.lineup.title')}
      </h3>
      {players.length === 0 && newRowId === null && (
        <p className={helpTextClassName}>
          {t('settings:matchMenu.lineup.empty')}
        </p>
      )}
      {(players.length > 0 || newRowId !== null) && (
        <ul role="list" className="mt-3 space-y-2">
          {players.map((player, index) => (
            <PlayerRow
              // Rows are positions in the list: only the focused row can hold
              // a draft, and leaving it commits before anything else moves.
              key={index}
              idPrefix={idPrefix}
              index={index}
              team={team}
              values={{
                number: player.number ?? '',
                name: player.name,
                starting: isStarter(player),
              }}
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
              values={{ number: '', name: '', starting: true }}
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
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ActionButton
          size="md"
          disabled={disabled || atCap}
          onClick={() => openNewRow(true)}
        >
          {t('settings:matchMenu.lineup.addPlayer')}
        </ActionButton>
        <ActionButton
          size="md"
          disabled={disabled || atCap}
          onClick={() => setPasteOpen(true)}
        >
          {t('settings:matchMenu.lineup.pasteList')}
        </ActionButton>
        {players.length > 0 && (
          <span className="text-sm text-muted">
            {t('settings:matchMenu.lineup.count', { count: players.length })} (
            {t('settings:matchMenu.lineup.cap', { max: MAX_PLAYERS_PER_TEAM })})
          </span>
        )}
        {/* Only worth a line once someone is on the bench: with everyone
            starting the player count already says it all. */}
        {benchCount > 0 && (
          <span className="text-sm text-muted">
            {t('settings:matchMenu.lineup.squadSummary', {
              starting: t('settings:matchMenu.lineup.startingCount', {
                count: startingCount,
              }),
              bench: t('settings:matchMenu.lineup.benchCount', {
                count: benchCount,
              }),
            })}
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
        <label htmlFor={pasteId} className="block text-sm text-muted">
          {t('settings:matchMenu.lineup.pasteHint')}
        </label>
        <textarea
          id={pasteId}
          rows={10}
          className={classNames(textareaClassName, 'mt-2')}
          value={pasteText}
          onChange={(event) => setPasteText(event.target.value)}
        />
      </Modal>
    </section>
  );
}
