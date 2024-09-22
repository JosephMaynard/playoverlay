import { Penalty } from '../../../types';

import './PenaltyRow.css';

export interface Props {
  penalties: Penalty[];
  penaltiesTaken: number;
}

export default function PenaltyRow({ penalties, penaltiesTaken }: Props) {
  const penaltiesToDisplay: (Penalty | any)[] = [
    ...penalties.slice(Math.floor((Math.ceil(penaltiesTaken / 2) - 1) / 5) * 5),
    ...Array.from({ length: 5 - ((penalties.length - 1) % 5) - 1 }, () => ({
      result: 'not-taken',
    })),
  ];
  return (
    <div className="PenaltyRow bg-black">
      {(penaltiesToDisplay.length
        ? penaltiesToDisplay
        : Array.from({ length: 5 }, () => ({
            result: 'not-taken',
          }))
      ).map((pen, index) => (
        <div
          key={`${pen?.team}-${index}`}
          className={`PenaltyRow_item ${pen?.result === 'scored' ? ' bg-green-500' : ''} ${pen?.result === 'not-taken' ? ' bg-gray-500' : ''}  ${pen?.result === 'missed' ? ' bg-red-600' : ''}`}
        />
      ))}
    </div>
  );
}
