import { useState } from 'react';
import { Penalty, TeamSettingsInterface, homeOrAway } from '../../types';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import Modal from '../Modal/Modal';
import PenaltiesBoard from '../PenaltiesLayout/PenaltiesBoard';

export interface Props {
  penalties: Penalty[];
  setPenalties: (penalties: Penalty[]) => void;
  penaltiesFirstTeam: homeOrAway;
  setPenaltiesFirstTeam: (team: homeOrAway) => void;
  teamSettings: TeamSettingsInterface;
}

export default function PenaltiesPanel({
  penalties,
  setPenalties,
  penaltiesFirstTeam,
  setPenaltiesFirstTeam,
  teamSettings,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const nextPenalyTeam: homeOrAway =
    penalties.length === 0
      ? penaltiesFirstTeam
      : penalties[penalties.length - 1].team === 'home'
        ? 'away'
        : 'home';

  return (
    <CollapsiblePanel title="Penalties">
      <div className="mb-4 grid grid-cols-2">
        <div className=" [--base-size:1.25rem]">
          <PenaltiesBoard
            className="border border-gray-600"
            teamSettings={teamSettings}
            penalties={penalties}
            penaltiesFirstTeam={penaltiesFirstTeam}
          />
        </div>
        <ButtonGrid
          className="mb-4"
          buttons={[
            {
              label: 'Home Team First',
              onClick: () => setPenaltiesFirstTeam('home'),
              selected: penaltiesFirstTeam === 'home',
              disabled: penalties.length > 0,
            },
            {
              label: 'Away Team First',
              onClick: () => setPenaltiesFirstTeam('away'),
              selected: penaltiesFirstTeam === 'away',
              disabled: penalties.length > 0,
            },
          ]}
        />
      </div>
      <h3 className="my-4 text-base font-semibold leading-6 text-gray-900">
        Next Penalty{' '}
        {nextPenalyTeam === 'home'
          ? teamSettings.homeTeamNameFull
          : teamSettings.awayTeamNameFull}{' '}
        ({nextPenalyTeam === 'home' ? 'Home' : 'Away'} Team):
      </h3>

      <ButtonGrid
        className="mb-4"
        buttons={[
          {
            label: 'Score',
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
            label: 'Miss',
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
        buttons={[
          {
            label: 'Undo Penalty',
            onClick: () => {
              if (penalties.length > 0) {
                setPenalties(penalties.slice(0, -1));
              }
            },
            color: 'text-white',
            backgroundColor: 'bg-indigo-600',
          },
          {
            label: 'Reset Penalties',
            onClick: () => setModalOpen(true),
            backgroundColor: 'bg-red-700',
            color: 'text-white',
          },
        ]}
      />
      <Modal
        open={modalOpen}
        setOpen={setModalOpen}
        title="Reset the penalties?"
        actionButtonLabel="Reset penalties"
        icon="warning"
        action={() => {
          setPenalties([]);
          setModalOpen(false);
        }}
      >
        <p className="text-sm text-gray-500">
          Are you sure you want to reset the penalties?
        </p>
      </Modal>
    </CollapsiblePanel>
  );
}
