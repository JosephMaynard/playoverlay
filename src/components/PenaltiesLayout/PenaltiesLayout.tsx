import { Penalty, TeamSettingsInterface, homeOrAway } from '../../types';
import PenaltiesBoard from './PenaltiesBoard';

import './PenaltiesLayout.css';

export interface Props {
  penalties: Penalty[];
  penaltiesFirstTeam: homeOrAway;
  teamSettings: TeamSettingsInterface;
  active: boolean;
}

export default function PenaltiesLayout({
  penalties,
  penaltiesFirstTeam,
  teamSettings,
  active,
}: Props) {
  return (
    <div
      className={`PenaltiesLayout${active ? ' PenaltiesLayout_active' : ''}`}
    >
      <div
        className={`PenaltiesLayout_wrapper${active ? ' PenaltiesLayout_wrapper_active' : ''}`}
      >
        <PenaltiesBoard
          penalties={penalties}
          penaltiesFirstTeam={penaltiesFirstTeam}
          teamSettings={teamSettings}
        />
      </div>
    </div>
  );
}
