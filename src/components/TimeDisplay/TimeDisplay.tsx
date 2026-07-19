import { PencilIcon } from '@heroicons/react/24/outline';
import { Time } from '../../types';
import { getPhaseById } from '../../utils';
import { MatchSettings } from '../../zodSchemas';

export interface Props {
  time: Time;
  matchSettings: MatchSettings;
  openAdjustmentsModal?: () => void;
}

export default function TimeDisplay({
  time,
  matchSettings,
  openAdjustmentsModal,
}: Props) {
  return (
    <div className="relative flex min-h-32 flex-col items-center justify-center bg-black py-1">
      {time.time ? (
        <div className="grid h-full w-full grid-cols-2 grid-rows-1">
          <div className="flex items-center justify-center">
            <p className="text-center font-semibold tabular-nums text-white [font-size:5rem]">
              {time.time}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center font-semibold">
            {time.matchPhase && (
              <p className="mb-1 text-center text-sm tabular-nums text-white">
                {getPhaseById(matchSettings, time.matchPhase)?.title}
              </p>
            )}
            {time.remainingTime && (
              <p className="text-center text-6xl font-normal text-white">
                <span className="tabular-nums">{time.remainingTime}</span>
              </p>
            )}
            {time.additionalTime && (
              <p className="mt-1 text-center text-sm font-light text-white">
                Additional time:{' '}
                <span className="font-semibold tabular-nums">
                  {time.additionalTime} minutes
                </span>
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
      {openAdjustmentsModal && time.time && (
        <button
          type="button"
          className="absolute right-4 top-4 rounded-full bg-white p-2 text-black shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => openAdjustmentsModal()}
        >
          <PencilIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
