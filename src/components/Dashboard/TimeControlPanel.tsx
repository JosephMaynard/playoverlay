import { PlayIcon, PauseIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Time } from '../../types';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import { MatchPhase } from 'src/constants';
import { useState } from 'react';
import WideModal from '../Modal/WideModal';
import TimeDisplay from '../TimeDisplay/TimeDisplay';

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
  const [modal, setModal] = useState<
    'adjustTime' | 'additionaTime' | undefined
  >();
  return (
    <CollapsiblePanel title="Time" noPanelPadding>
      <TimeDisplay
        time={time}
        openAdjustmentsModal={() => setModal('adjustTime')}
      />
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
          <div className="flex gap-4">
            <div className="mb-2 mt-2 flex rounded-md shadow-sm">
              <div className="relative flex flex-grow items-stretch focus-within:z-10">
                <input
                  type="number"
                  name="additionalTime"
                  id="additionalTime"
                  className="block w-full rounded-none rounded-l-md border-0 py-1.5 text-center text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-900 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  onChange={(e) => setAdditionalTime(Number(e.target.value))}
                  value={time.additionalTime || ''}
                />
                <button
                  type="button"
                  className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  onClick={() => setAdditionalTime()}
                >
                  <XMarkIcon
                    className="-ml-0.5 h-5 w-5 text-gray-900"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
            <button
              type="button"
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={() => setModal('additionaTime')}
            >
              Set Additional Time
            </button>
          </div>
        </div>
      </div>
      <WideModal
        open={modal === 'additionaTime'}
        setOpen={(_) => {
          setModal(undefined);
        }}
        title="Set Additional Time"
      >
        <ButtonGrid
          buttons={Array.from(new Array(15)).map((_, index) => ({
            label: `${index + 1}min`,
            onClick: () => {
              setAdditionalTime(index + 1);
              setModal(undefined);
            },
          }))}
        />
      </WideModal>
      <WideModal
        open={modal === 'adjustTime'}
        setOpen={(_) => {
          setModal(undefined);
        }}
        title="Adjust Time"
      >
        <TimeDisplay time={time} />

        <div className="mx-auto mt-8 text-center">
          <span className="text-s isolate mx-auto inline-flex rounded-md shadow-sm">
            <button
              type="button"
              disabled={!time.time}
              className="relative inline-flex items-center rounded-l-md bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(-600)}
            >
              -10m
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex  items-center bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(-60)}
            >
              -1m
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex  items-center bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(-10)}
            >
              -10s
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex  items-center bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(-1)}
            >
              -1s
            </button>
            {isPaused ? (
              <button
                type="button"
                disabled={!time.time}
                className="relative -ml-px inline-flex  items-center bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
                onClick={() => resume()}
              >
                <PlayIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!time.time}
                className="relative -ml-px inline-flex  items-center bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
                onClick={() => pause()}
              >
                <PauseIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex  items-center bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(1)}
            >
              +1s
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex  items-center bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(10)}
            >
              +10s
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex  items-center bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(60)}
            >
              +1m
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex items-center rounded-r-md bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(600)}
            >
              +10m
            </button>
          </span>
        </div>
      </WideModal>
    </CollapsiblePanel>
  );
}
