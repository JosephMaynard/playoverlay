import { PlayIcon, PauseIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Time, MatchPhase } from '../../types';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import WideModal from '../Modal/WideModal';
import TimeDisplay from '../TimeDisplay/TimeDisplay';
import { Switch } from '@headlessui/react';
import { classNames, getPhaseList, getPhaseTitle } from '../..//utils';
import { MatchSettings } from '../../zodSchemas';

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
}: Props) {
  const { t } = useTranslation();
  const [modal, setModal] = useState<
    'adjustTime' | 'additionalTime' | undefined
  >();
  // Starting/stopping a phase's auto-switch-screens behaviour is handled by
  // startTime/stopTime themselves (centralised in useMatchClock); this
  // panel just triggers them.
  const phaseButtons = getPhaseList(matchSettings).map((phase) => ({
    label: getPhaseTitle(t, phase),
    onClick: () => startTime(phase.id),
    selected: time.matchPhase === phase.id,
  }));
  return (
    <CollapsiblePanel title={t('dashboard:timeControl.title')} noPanelPadding>
      <TimeDisplay
        time={time}
        matchSettings={matchSettings}
        openAdjustmentsModal={() => setModal('adjustTime')}
      />
      <div className="p-4">
        <ButtonGrid
          className="mb-4"
          buttons={[
            ...phaseButtons,
            {
              label: t('settings:system.stop'),
              onClick: () => stopTime(),
              backgroundColor: 'bg-red-700',
              color: 'text-white',
            },
            {
              label: t('dashboard:timeControl.setAdditionalTime'),
              onClick: () => setModal('additionalTime'),
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
              {t('dashboard:timeControl.autoSwitchLabel')}
            </span>
          </Switch.Label>
        </Switch.Group>
      </div>
      <WideModal
        open={modal === 'additionalTime'}
        setOpen={() => {
          setModal(undefined);
        }}
        title={t('dashboard:timeControl.setAdditionalTime')}
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
              label: t('dashboard:timeControl.additionalTimeMinutes', {
                n: index + 1,
              }),
              onClick: () => {
                setAdditionalTime(index + 1);
                setModal(undefined);
              },
            })),
            {
              label: t('dashboard:timeControl.clear'),
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
        setOpen={() => {
          setModal(undefined);
        }}
        title={t('dashboard:timeControl.adjustTimeModalTitle')}
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
              {t('dashboard:timeControl.adjustMinutes', { sign: '-', n: 10 })}
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex items-center bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(-60)}
            >
              {t('dashboard:timeControl.adjustMinutes', { sign: '-', n: 1 })}
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex items-center bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(-10)}
            >
              {t('dashboard:timeControl.adjustSeconds', { sign: '-', n: 10 })}
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex items-center bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(-1)}
            >
              {t('dashboard:timeControl.adjustSeconds', { sign: '-', n: 1 })}
            </button>
            {isPaused ? (
              <button
                type="button"
                disabled={!time.time}
                className="relative -ml-px inline-flex items-center bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
                onClick={() => resume()}
              >
                <PlayIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!time.time}
                className="relative -ml-px inline-flex items-center bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
                onClick={() => pause()}
              >
                <PauseIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex items-center bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(1)}
            >
              {t('dashboard:timeControl.adjustSeconds', { sign: '+', n: 1 })}
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex items-center bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(10)}
            >
              {t('dashboard:timeControl.adjustSeconds', { sign: '+', n: 10 })}
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex items-center bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(60)}
            >
              {t('dashboard:timeControl.adjustMinutes', { sign: '+', n: 1 })}
            </button>
            <button
              type="button"
              disabled={!time.time}
              className="relative -ml-px inline-flex items-center rounded-r-md bg-white px-4 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 md:text-sm xl:text-base"
              onClick={() => adjustTime(600)}
            >
              {t('dashboard:timeControl.adjustMinutes', { sign: '+', n: 10 })}
            </button>
          </span>
        </div>
      </WideModal>
    </CollapsiblePanel>
  );
}
