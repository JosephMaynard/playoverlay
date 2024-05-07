import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { matchPhases } from '../..//constants';
import { Time } from '../../types';

export interface Props {
  time: Time;
  openAdjustmentsModal?: () => void;
}

export default function TimeDisplay({ time, openAdjustmentsModal }: Props) {
  return (
    <div className="relative flex min-h-20 flex-col items-center justify-center  bg-black py-1">
      {time.time ? (
        <div className="grid h-full w-full grid-cols-2 grid-rows-1">
          <div className="flex items-center justify-center">
            <p className="text-center text-5xl font-semibold text-white">
              {time.time}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center font-semibold">
            {time.matchPhase && (
              <p className="mb-1 text-center tabular-nums text-white">
                {matchPhases[time.matchPhase]?.title}
              </p>
            )}
            {time.remainingTime && (
              <p className="text-center font-light text-white">
                Time remaining:{' '}
                <span className="tabular-nums">{time.remainingTime}</span>
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-center text-5xl font-semibold text-white">
            Not running
          </p>
        </div>
      )}
      {openAdjustmentsModal && (
        <button
          type="button"
          className="absolute right-4 top-4 z-50 rounded-full bg-white p-2 text-black shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => openAdjustmentsModal()}
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
