import { MatchSettings } from 'src/zodSchemas';
import { Penalty, homeOrAway } from '../../../types';
import PenaltiesBoard from './PenaltiesBoard';

import './PenaltiesLayout.css';

export interface Props {
  penalties: Penalty[];
  penaltiesFirstTeam: homeOrAway;
  matchSettings: MatchSettings;
  active: boolean;
}

export default function PenaltiesLayout({
  penalties,
  penaltiesFirstTeam,
  matchSettings,
  active,
}: Props) {
  return (
    <div
      className={`PenaltiesLayout ${active ? 'PenaltiesLayout_active' : ''}`}
    >
      <div
        className={`PenaltiesLayout_wrapper ${active ? 'PenaltiesLayout_wrapper_active' : ''}`}
      >
        <PenaltiesBoard
          penalties={penalties}
          penaltiesFirstTeam={penaltiesFirstTeam}
          matchSettings={matchSettings}
        />
      </div>
    </div>
  );
}
