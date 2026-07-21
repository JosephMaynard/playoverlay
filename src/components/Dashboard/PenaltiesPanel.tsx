import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Penalty, homeOrAway } from '../../types';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import Modal from '../Modal/Modal';
import PenaltiesBoard from '../Screens/PenaltiesLayout/PenaltiesBoard';
import { MatchSettings } from 'src/zodSchemas';

export interface Props {
  penalties: Penalty[];
  setPenalties: (penalties: Penalty[]) => void;
  penaltiesFirstTeam: homeOrAway;
  setPenaltiesFirstTeam: (team: homeOrAway) => void;
  matchSettings: MatchSettings;
}

export default function PenaltiesPanel({
  penalties,
  setPenalties,
  penaltiesFirstTeam,
  setPenaltiesFirstTeam,
  matchSettings,
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
    <CollapsiblePanel title={t('settings:system.screens.penalties')}>
      <div className="mb-4 [--base-size:1.25rem]">
        <PenaltiesBoard
          className="border border-gray-600"
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
      <h3 className="my-4 text-base font-semibold leading-6 text-gray-900">
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
              setPenalties([
                ...penalties,
                {
                  team: nextPenalyTeam,
                  result: 'scored',
                },
              ]);
            },
            color: 'text-white',
            backgroundColor: 'bg-green-600',
          },
          {
            label: t('dashboard:penaltiesPanel.miss'),
            onClick: () => {
              setPenalties([
                ...penalties,
                {
                  team: nextPenalyTeam,
                  result: 'missed',
                },
              ]);
            },
            backgroundColor: 'bg-red-700',
            color: 'text-white',
          },
        ]}
      />
      <ButtonGrid
        compact
        buttons={[
          {
            label: t('dashboard:penaltiesPanel.undoPenalty'),
            onClick: () => {
              if (penalties.length > 0) {
                setPenalties(penalties.slice(0, -1));
              }
            },
            color: 'text-white',
            backgroundColor: 'bg-indigo-600',
          },
          {
            label: t('dashboard:penaltiesPanel.resetPenalties'),
            onClick: () => setModalOpen(true),
            backgroundColor: 'bg-red-700',
            color: 'text-white',
          },
        ]}
      />
      <Modal
        open={modalOpen}
        setOpen={setModalOpen}
        title={t('dashboard:penaltiesPanel.resetConfirmTitle')}
        actionButtonLabel={t('dashboard:penaltiesPanel.resetConfirmAction')}
        icon="warning"
        action={() => {
          setPenalties([]);
          setModalOpen(false);
        }}
      >
        <p className="text-sm text-gray-500">
          {t('dashboard:penaltiesPanel.resetConfirmBody')}
        </p>
      </Modal>
    </CollapsiblePanel>
  );
}
