import { useState } from 'react';
import { Penalty, homeOrAway } from '../../types';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ConfirmModal from '../ConfirmModal/ConfirmModal';

export interface Props {
  penalties: Penalty[];
  setPenalties: (penalties: Penalty[]) => void;
  penaltiesFirstTeam: homeOrAway;
  setPenaltiesFirstTeam: (team: homeOrAway) => void;
}

export default function PenaltiesPanel({
  penalties,
  setPenalties,
  penaltiesFirstTeam,
  setPenaltiesFirstTeam,
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
      {penalties.length === 0 && (
        <ButtonGrid
          className="mb-4"
          buttons={[
            {
              label: 'Home Team First',
              onClick: () => setPenaltiesFirstTeam('home'),
              selected: penaltiesFirstTeam === 'home',
            },
            {
              label: 'Away Team First',
              onClick: () => setPenaltiesFirstTeam('away'),
              selected: penaltiesFirstTeam === 'away',
            },
          ]}
        />
      )}
      <p>{penalties.map((pen) => pen.result).join(' - ')}</p>
      <h3 className="text-base font-semibold leading-6 text-gray-900">
        Next Penalty {nextPenalyTeam === 'home' ? 'Home' : 'Away'} Team:
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
      <ConfirmModal
        open={modalOpen}
        setOpen={setModalOpen}
        title="Reset the penalties?"
        body="Are you sure you want to reset the penalties?"
        actionButtonLabel="Reset penalties"
        action={() => {
          setPenalties([]);
          setModalOpen(false);
        }}
      />
    </CollapsiblePanel>
  );
}
