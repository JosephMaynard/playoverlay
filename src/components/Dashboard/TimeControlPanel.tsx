import { PlayIcon, PauseIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { DisplayScreen, Time, MatchPhase, MatchSettings } from '../../types';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import { useState } from 'react';
import WideModal from '../Modal/WideModal';
import TimeDisplay from '../TimeDisplay/TimeDisplay';
import { Switch } from '@headlessui/react';
import { classNames } from '../..//utils';

export interface Props {
  time: Time;
  matchSettings: MatchSettings;
  pause: () => void;
  resume: () => void;
  adjustTime: (difference: number) => void;
  isPaused: boolean;
  setAdditionalTime: (additionalTime?: number) => void;
  startTime: (matchPhase: MatchPhase) => void;
  stopTime: () => void;
  autoSwitchScreens: boolean;
  setAutoSwitchScreens: (autoSwitchScreens: boolean) => void;
  setDisplayScreen: (displayScreen: DisplayScreen) => void;
}

export default function TimeControlPanel({
  time,
  matchSettings,
  pause,
  resume,
  adjustTime,
  isPaused,
  setAdditionalTime,
  startTime,
  stopTime,
  autoSwitchScreens,
  setAutoSwitchScreens,
  setDisplayScreen,
}: Props) {
  const [modal, setModal] = useState<
    'adjustTime' | 'additionaTime' | undefined
  >();
  const handleStartTime = (matchPhase: MatchPhase) => {
    startTime(matchPhase);
    if (autoSwitchScreens === true) {
      setDisplayScreen('scoreBug');
    }
  };
  return (
    <CollapsiblePanel title="Time" noPanelPadding>
      <TimeDisplay
        time={time}
        matchSettings={matchSettings}
        openAdjustmentsModal={() => setModal('adjustTime')}
      />
      <div className="p-4">
        <ButtonGrid
          className="mb-4"
          buttons={[
            {
              label: 'First Half',
              onClick: () => handleStartTime('firstHalf'),
              selected: time.matchPhase === 'firstHalf',
            },
            {
              label: 'Second Half',
              onClick: () => handleStartTime('secondHalf'),
              selected: time.matchPhase === 'secondHalf',
            },
            {
              label: 'Extra Time First Half',
              onClick: () => handleStartTime('extraTimeFirstHalf'),
              selected: time.matchPhase === 'extraTimeFirstHalf',
            },
            {
              label: 'Extra Time Second Half',
              onClick: () => handleStartTime('extraTimeSecondHalf'),
              selected: time.matchPhase === 'extraTimeSecondHalf',
            },
            {
              label: 'Stop',
              onClick: () => {
                stopTime();
                if (autoSwitchScreens === true) {
                  setDisplayScreen('matchTitle');
                }
              },
              backgroundColor: 'bg-red-700',
              color: 'text-white',
            },
            {
              label: 'Set Additional Time',
              onClick: () => setModal('additionaTime'),
              backgroundColor: 'bg-indigo-600',
              color: 'text-white',
            },
          ]}
        />
        <Switch.Group as="div" className="mx-3 ml-2 flex items-center">
          <Switch
            checked={autoSwitchScreens}
            onChange={setAutoSwitchScreens}
            className={classNames(
              autoSwitchScreens ? 'bg-indigo-600' : 'bg-gray-200',
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2'
            )}
          >
            <span
              aria-hidden="true"
              className={classNames(
                autoSwitchScreens ? 'translate-x-5' : 'translate-x-0',
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
              )}
            />
          </Switch>
          <Switch.Label as="span" className="ml-3 text-sm">
            <span className="font-medium text-gray-900">
              Auto switch screens on start and stop
            </span>
          </Switch.Label>
        </Switch.Group>
      </div>
      <WideModal
        open={modal === 'additionaTime'}
        setOpen={(_) => {
          setModal(undefined);
        }}
        title="Set Additional Time"
      >
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
        <ButtonGrid
          buttons={[
            ...Array.from(new Array(17)).map((_, index) => ({
              label: `${index + 1}min`,
              onClick: () => {
                setAdditionalTime(index + 1);
                setModal(undefined);
              },
            })),
            {
              label: 'Clear',
              onClick: () => {
                setAdditionalTime();
                setModal(undefined);
              },
              backgroundColor: 'bg-red-700',
              color: 'text-white',
            },
          ]}
        />
      </WideModal>
      <WideModal
        open={modal === 'adjustTime'}
        setOpen={(_) => {
          setModal(undefined);
        }}
        title="Adjust Time"
      >
        <TimeDisplay time={time} matchSettings={matchSettings} />

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
