import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Penalty,
  homeOrAway,
  MatchSettings,
  classNames,
} from '@playoverlay/core';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import Modal from '../Modal/Modal';
import ActionButton from '../ui/ActionButton';
import { sectionHeadingClassName } from '../ui/fields';
import { PenaltiesBoard } from '@playoverlay/screens';

export interface Props {
  penalties: Penalty[];
  // setPenalties records a global undo entry (labelled by the second arg)
  // before applying the change, so penalty edits share the app-wide stack.
  setPenalties: (penalties: Penalty[], label: string) => void;
  penaltiesFirstTeam: homeOrAway;
  setPenaltiesFirstTeam: (team: homeOrAway) => void;
  matchSettings: MatchSettings;
  // The panel's undo button delegates to the global undo (the shared stack,
  // not a penalty-only one) so there is a single source of truth: it and
  // Ctrl/Cmd+Z can never disagree about state. Its label is deliberately
  // generic ("Undo Last Action") rather than penalty-specific, since it can
  // undo any last action, not only a penalty. canUndo drives its disabled
  // state.
  onUndo: () => void;
  canUndo: boolean;
}

export default function PenaltiesPanel({
  penalties,
  setPenalties,
  penaltiesFirstTeam,
  setPenaltiesFirstTeam,
  matchSettings,
  onUndo,
  canUndo,
}: Props) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const nextPenalyTeam: homeOrAway =
    penalties.length === 0
      ? penaltiesFirstTeam
      : penalties[penalties.length - 1].team === 'home'
        ? 'away'
        : 'home';

  return (
    <div>
      <div className="mb-4 [--base-size:1.25rem]">
        <PenaltiesBoard
          className="border border-line-strong"
          matchSettings={matchSettings}
          penalties={penalties}
          penaltiesFirstTeam={penaltiesFirstTeam}
        />
      </div>
      <ButtonGrid
        compact
        className="mb-4"
        buttons={[
          {
            label: t('dashboard:penaltiesPanel.teamFirst', {
              team: t('settings:matchMenu.homeTeam'),
            }),
            onClick: () => setPenaltiesFirstTeam('home'),
            selected: penaltiesFirstTeam === 'home',
            disabled: penalties.length > 0,
          },
          {
            label: t('dashboard:penaltiesPanel.teamFirst', {
              team: t('settings:matchMenu.awayTeam'),
            }),
            onClick: () => setPenaltiesFirstTeam('away'),
            selected: penaltiesFirstTeam === 'away',
            disabled: penalties.length > 0,
          },
        ]}
      />
      <h3 className={classNames(sectionHeadingClassName, 'my-4 text-lg')}>
        {t('dashboard:penaltiesPanel.nextPenalty', {
          team:
            nextPenalyTeam === 'home'
              ? matchSettings.homeTeamNameFull
              : matchSettings.awayTeamNameFull,
          side: t(
            nextPenalyTeam === 'home'
              ? 'settings:matchMenu.homeTeam'
              : 'settings:matchMenu.awayTeam'
          ),
        })}
      </h3>

      <ButtonGrid
        compact
        className="mb-4"
        buttons={[
          {
            label: t('dashboard:penaltiesPanel.score'),
            onClick: () => {
              setPenalties(
                [
                  ...penalties,
                  {
                    team: nextPenalyTeam,
                    result: 'scored',
                  },
                ],
                'undo:actions.penaltyScored'
              );
            },
            variant: 'live',
            size: 'xl',
          },
          {
            label: t('dashboard:penaltiesPanel.miss'),
            onClick: () => {
              setPenalties(
                [
                  ...penalties,
                  {
                    team: nextPenalyTeam,
                    result: 'missed',
                  },
                ],
                'undo:actions.penaltyMissed'
              );
            },
            variant: 'danger',
            size: 'xl',
          },
        ]}
      />
      <div className="flex flex-col gap-3">
        <ActionButton
          variant="primary"
          size="lg"
          block
          // Delegates to the global undo rather than doing its own local
          // slice: the last penalty add is on the shared undo stack, so this
          // and Ctrl/Cmd+Z reverse the exact same thing. Disabled (not just
          // guarded) when there is nothing to undo.
          onClick={onUndo}
          disabled={!canUndo}
        >
          {t('dashboard:penaltiesPanel.undoLastAction')}
        </ActionButton>
        {/* Quiet on purpose: a reset next to Score and Miss must not look like
            a third live control. */}
        <ActionButton
          variant="danger-ghost"
          size="md"
          className="self-end"
          onClick={() => setModalOpen(true)}
        >
          {t('dashboard:penaltiesPanel.resetPenalties')}
        </ActionButton>
      </div>
      <Modal
        open={modalOpen}
        setOpen={setModalOpen}
        title={t('dashboard:penaltiesPanel.resetConfirmTitle')}
        actionButtonLabel={t('dashboard:penaltiesPanel.resetConfirmAction')}
        icon="warning"
        action={() => {
          setPenalties([], 'undo:actions.penaltiesReset');
          setModalOpen(false);
        }}
      >
        <p className="text-sm text-muted">
          {t('dashboard:penaltiesPanel.resetConfirmBody')}
        </p>
      </Modal>
    </div>
  );
}
