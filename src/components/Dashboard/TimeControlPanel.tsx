import { PlayIcon, PauseIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Time } from '../../types';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import { MatchPhase } from 'src/constants';

export interface Props {
  time: Time;
  pause: () => void;
  resume: () => void;
  adjustTime: (difference: number) => void;
  isPaused: boolean;
  setAdditionalTime: (additionalTime?: number) => void;
  startTime: (matchPhase: MatchPhase) => void;
  stopTime: () => void;
  matchPhase?: MatchPhase;
}

export default function TimeControlPanel({
  time,
  pause,
  resume,
  adjustTime,
  isPaused,
  setAdditionalTime,
  startTime,
  stopTime,
  matchPhase,
}: Props) {
  return (
    <CollapsiblePanel title="Time" className="mx-auto max-w-4xl" noPanelPadding>
      <div className="bg-black py-1">
        <p className="my-6 text-center text-5xl font-semibold text-white">
          {time.time || 'Not running'}
        </p>
        <div className="mx-auto mb-4 text-center">
          <span className="text-s isolate mx-auto inline-flex rounded-md shadow-sm">
            <button
              type="button"
              disabled={!time.time}
              className="relative inline-flex items-center rounded-l-md bg-white px-4 py-2 text-xs text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(-600)}
            >
              -10m
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex items-center  bg-white px-4 py-2 text-xs text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(-60)}
            >
              -1m
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex items-center  bg-white px-4 py-2 text-xs text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(-10)}
            >
              -10s
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex items-center  bg-white px-4 py-2 text-xs text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(-1)}
            >
              -1s
            </button>
            {isPaused ? (
              <button
                type="button"
                disabled={!time.time}
                className="relative -ml-px inline-flex items-center  bg-white px-4 py-2 text-xs text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
                onClick={() => resume()}
              >
                <PlayIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!time.time}
                className="relative -ml-px inline-flex items-center  bg-white px-4 py-2 text-xs text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
                onClick={() => pause()}
              >
                <PauseIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex items-center  bg-white px-4 py-2 text-xs text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(1)}
            >
              +1s
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex items-center  bg-white px-4 py-2 text-xs text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(10)}
            >
              +10s
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex items-center  bg-white px-4 py-2 text-xs text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(60)}
            >
              +1m
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex items-center rounded-r-md bg-white px-4 py-2 text-xs text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(600)}
            >
              +10m
            </button>
          </span>
        </div>
      </div>
      <div className="p-4">
        <ButtonGrid
          className="mb-4"
          buttons={[
            {
              label: 'First Half',
              onClick: () => startTime('firstHalf'),
              selected: matchPhase === 'firstHalf',
            },
            {
              label: 'Second Half',
              onClick: () => startTime('secondHalf'),
              selected: matchPhase === 'secondHalf',
            },
            {
              label: 'Extra Time First Half',
              onClick: () => startTime('extraTimeFirstHalf'),
              selected: matchPhase === 'extraTimeFirstHalf',
            },
            {
              label: 'Extra Time Second Half',
              onClick: () => startTime('extraTimeSecondHalf'),
              selected: matchPhase === 'extraTimeSecondHalf',
            },
            {
              label: 'Stop',
              onClick: () => stopTime(),
              backgroundColor: 'bg-red-700',
              color: 'text-white',
            },
          ]}
        />
        <div>
          <label
            htmlFor="additionalTime"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Additional Time
          </label>
          <div className="mb-2 mt-2 flex rounded-md shadow-sm">
            <div className="relative flex flex-grow items-stretch focus-within:z-10">
              <input
                type="number"
                name="additionalTime"
                id="additionalTime"
                className="block w-full rounded-none rounded-l-md border-0 py-1.5 text-center text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                onChange={(e) => setAdditionalTime(Number(e.target.value))}
                value={time.additionalTime || ''}
              />
              <button
                type="button"
                className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                onClick={() => setAdditionalTime()}
              >
                <XMarkIcon
                  className="-ml-0.5 h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {Array.from(new Array(12)).map((_, index) => (
              <button
                key={index}
                className="rounded-lg bg-white px-2 py-3.5 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                onClick={() => setAdditionalTime(index + 1)}
              >
                {index + 1}min
              </button>
            ))}
          </div>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
