import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import {
  MatchSettings,
  Player,
  Substitution,
  classNames,
  formatPlayer,
  homeOrAway,
  lineupAfterSubstitutions,
  samePlayer,
} from '@playoverlay/core';
import ActionButton from '../ui/ActionButton';
import IconButton from '../ui/IconButton';

export interface Props {
  // The team making a change; null closes the modal.
  team: homeOrAway | null;
  matchSettings: MatchSettings;
  substitutions: Substitution[];
  onConfirm: (team: homeOrAway, off: Player, on: Player) => void;
  onClose: () => void;
}

function PlayerTile({
  player,
  selected,
  onPick,
}: {
  player: Player;
  selected?: boolean;
  onPick: (player: Player) => void;
}) {
  return (
    <ActionButton
      size="lg"
      className="justify-start"
      selected={selected}
      selectedTone="go"
      onClick={() => onPick(player)}
    >
      <span
        className={classNames(
          'w-8 flex-shrink-0 text-right text-xl tabular-nums',
          selected ? 'text-white/80' : 'text-muted'
        )}
      >
        {player.number}
      </span>
      <span className="truncate">{player.name}</span>
    </ActionButton>
  );
}

// A substitution in two steps: who is coming off (from the players on the
// pitch), then who is coming on (from the bench), with a confirm so a
// stray tap never logs a change. "Confirm and make another" keeps the
// modal open for a double or triple change at the same stoppage.
export default function SubstitutionModal({
  team,
  matchSettings,
  substitutions,
  onConfirm,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const open = team !== null;
  const [off, setOff] = useState<Player | null>(null);
  const [on, setOn] = useState<Player | null>(null);
  // Each opening starts afresh; a pick from the last change must never
  // carry over to a different team or a later stoppage.
  useEffect(() => {
    setOff(null);
    setOn(null);
  }, [team]);

  const lineup = team
    ? lineupAfterSubstitutions(matchSettings, team, substitutions)
    : { onPitch: [], bench: [] };
  const teamName =
    team === 'home'
      ? matchSettings.homeTeamNameFull
      : matchSettings.awayTeamNameFull;

  const confirm = (another: boolean) => {
    if (!team || !off || !on) return;
    onConfirm(team, off, on);
    if (another) {
      setOff(null);
      setOn(null);
    } else {
      onClose();
    }
  };

  const stepCard = (
    step: 1 | 2,
    title: string,
    value: Player | null,
    active: boolean
  ) => (
    <div
      className={classNames(
        'flex min-h-16 items-center gap-3 rounded-lg px-3 py-2 ring-1 ring-inset',
        active ? 'bg-surface-2 ring-2 ring-accent' : 'bg-surface-2 ring-line'
      )}
    >
      <span
        className={classNames(
          'inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold',
          value
            ? 'bg-live-soft text-live-ink'
            : active
              ? 'bg-accent text-accent-fg'
              : 'bg-line text-muted'
        )}
      >
        {value ? <CheckIcon className="h-5 w-5" aria-hidden="true" /> : step}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
          {title}
        </span>
        <span className="block truncate text-base font-semibold">
          {value
            ? formatPlayer(value)
            : step === 1
              ? t('dashboard:substitutions.pickOff')
              : t('dashboard:substitutions.pickOn')}
        </span>
      </span>
      {value && (
        <ActionButton
          size="sm"
          className="ml-auto flex-shrink-0"
          onClick={() => (step === 1 ? setOff(null) : setOn(null))}
        >
          {t('dashboard:substitutions.change')}
        </ActionButton>
      )}
    </div>
  );

  const tiles = (
    players: Player[],
    selected: Player | null,
    onPick: (player: Player) => void
  ) => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {players.map((player, index) => (
        <PlayerTile
          key={`${player.number ?? ''}-${player.name}-${index}`}
          player={player}
          selected={selected !== null && samePlayer(selected, player)}
          onPick={onPick}
        />
      ))}
    </div>
  );

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 z-50 bg-overlay/60 transition-opacity" />
        </Transition.Child>
        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-3xl transform overflow-hidden rounded-xl bg-surface p-5 text-left text-fg shadow-xl ring-1 ring-line transition-all">
                <div className="absolute right-2 top-2">
                  <IconButton
                    label={t('close')}
                    icon={<XMarkIcon className="h-6 w-6" aria-hidden="true" />}
                    onClick={onClose}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 pr-12">
                  <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-fg">
                    {t('dashboard:substitutions.key')}
                  </span>
                  <Dialog.Title as="h3" className="text-xl font-bold">
                    {teamName}
                  </Dialog.Title>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {stepCard(1, t('dashboard:substitutions.off'), off, !off)}
                  {stepCard(2, t('dashboard:substitutions.on'), on, !!off && !on)}
                </div>
                <h4 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
                  {off
                    ? t('dashboard:scorer.bench')
                    : t('dashboard:scorer.onPitch')}
                </h4>
                {off
                  ? tiles(lineup.bench, on, setOn)
                  : tiles(lineup.onPitch, off, setOff)}
                {off && lineup.bench.length === 0 && (
                  <p className="text-sm text-muted">
                    {t('dashboard:substitutions.emptyBench')}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <ActionButton variant="ghost" onClick={onClose}>
                    {t('cancel')}
                  </ActionButton>
                  <span className="flex-1" />
                  <ActionButton disabled={!off || !on} onClick={() => confirm(true)}>
                    {t('dashboard:substitutions.confirmAnother')}
                  </ActionButton>
                  <ActionButton
                    variant="live"
                    disabled={!off || !on}
                    onClick={() => confirm(false)}
                    icon={<CheckIcon className="h-5 w-5" aria-hidden="true" />}
                  >
                    {t('dashboard:substitutions.confirm')}
                  </ActionButton>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
