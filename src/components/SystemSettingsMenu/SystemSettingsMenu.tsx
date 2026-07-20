import { useEffect, useState } from 'react';
import {
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import SideMenu from '../SideMenu/SideMenu';
import { chunkArray, classNames, getPhaseList } from '../../utils';
import Modal from '../Modal/Modal';
import { MatchSettings } from '../../zodSchemas';
import { connectToStreamDeck, NEXT_SET_KEY_INDEX } from '../../stream-deck';
import { MatchPhase, MatchState, Time } from '../../types';
import { DisplayScreen, screens } from '../../constants';
import StreamDeckIcon from '../Icons/StreamDeckIcon';

export interface Props {
  open: boolean;
  matchSettings: MatchSettings;
  setOpen: () => void;
  incrementHomeTeamScore: () => void;
  incrementAwayTeamScore: () => void;
  startTime: (matchPhase: MatchPhase) => void;
  stopTime: () => void;
  updateMatchState: (settingsUpdated: Partial<MatchState>) => void;
  matchState: MatchState;
  time: Time;
}

export type Modals = null | 'about';

export default function SystemSettingsMenu({
  open,
  setOpen,
  matchSettings,
  incrementHomeTeamScore,
  incrementAwayTeamScore,
  startTime,
  stopTime,
  updateMatchState,
  time,
}: Props) {
  const [currentModal, setCurrentModal] = useState<Modals>(null);
  const [streamDeckConnected, setStreamDeckConnected] = useState(false);
  const [streamDeckButtons, setStreamdeckButtons] = useState(0);

  const scoringButtons = [
    {
      text: `${matchSettings.homeTeamNameFull} Scored`,
      // Same fallback hex values as defaultMatchSettings; that constant's
      // fields are optional per the MatchSettings type, so referencing it
      // directly wouldn't narrow away `undefined` here.
      textColor: matchSettings.homeTeamTextColour ?? '#ffffff',
      backgroundColor: matchSettings.homeTeamBackgroundColour ?? '#cc0000',
      onPress: incrementHomeTeamScore,
    },
    {
      text: `${matchSettings.awayTeamNameFull} Scored`,
      textColor: matchSettings.awayTeamTextColour ?? '#ffffff',
      backgroundColor: matchSettings.awayTeamBackgroundColour ?? '#0000cc',
      onPress: incrementAwayTeamScore,
    },
    {
      text: 'Stop',
      textColor: 'white',
      backgroundColor: 'red',
      onPress: () => stopTime(),
    },
  ];

  const phaseButtons = getPhaseList(matchSettings).map((phase) => ({
    text: phase.title,
    onPress: () => startTime(phase.id),
    textColor: 'black',
    backgroundColor: time.matchPhase === phase.id ? '#86EFAC' : 'white',
  }));

  const screenButtons = Object.keys(screens)
    .filter((screen) => screen !== 'custom')
    .filter(
      (screen) =>
        matchSettings.hasPenalties !== false || screen !== 'penalties'
    )
    .map((screen) => ({
      text: screens[screen as DisplayScreen],
      textColor: 'black',
      backgroundColor: 'white',
      onPress: () =>
        updateMatchState({
          displayScreen: screen as DisplayScreen,
          customScreenImageUrl: undefined,
        }),
    }));

  // Deck buttons are limited to NEXT_SET_KEY_INDEX usable keys per set (the
  // key after that is the "next set" logo key), so phases and screens page
  // across as many sets as they need instead of silently dropping the tail
  // (generic mode can have dozens of phases; screens now include scoreboard).
  const streamDeckButtonSets = [
    scoringButtons,
    ...chunkArray(phaseButtons, NEXT_SET_KEY_INDEX),
    ...chunkArray(screenButtons, NEXT_SET_KEY_INDEX),
  ];

  // The number of sets shrinks when settings change (fewer phases, penalties
  // toggled off). A page index saved while there were more sets must clamp
  // to the current range, or the deck redraw would index undefined and
  // silently disconnect mid-match.
  const activeButtonSet = Math.min(
    streamDeckButtons,
    streamDeckButtonSets.length - 1
  );

  const nextButtonSet = () => {
    setStreamdeckButtons((prevButtons) => {
      const nextButtons =
        prevButtons + 1 >= streamDeckButtonSets.length ? 0 : prevButtons + 1;
      console.log('Updating buttons:', prevButtons, 'to', nextButtons);
      return nextButtons;
    });
  };

  const handleNextButtonSet = () => {
    nextButtonSet();
  };

  useEffect(() => {
    if (streamDeckConnected) {
      connectToStreamDeck(
        streamDeckButtonSets[activeButtonSet],
        handleNextButtonSet
      ).catch((error: unknown) => {
        console.error('Failed to update Stream Deck:', error);
        setStreamDeckConnected(false);
      });
    }
    // time.matchPhase (not the whole ticking time object) so the phase
    // highlight updates without redrawing the deck every second.
    // streamDeckButtonSets/handleNextButtonSet are rebuilt from these same
    // deps on every render (not memoized), so including them would make this
    // effect refire on every unrelated re-render and redraw the deck needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamDeckButtons, streamDeckConnected, matchSettings, time.matchPhase]);

  return (
    <>
      <SideMenu open={open} setOpen={setOpen} title="System Settings">
        <ul role="list" className="-mx-2 space-y-1">
          <li>
            <button
              className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
              onClick={() => {
                setCurrentModal('about');
                setOpen();
              }}
            >
              <InformationCircleIcon
                className={classNames(
                  'text-gray-400 group-hover:text-indigo-600',
                  'h-6 w-6 shrink-0'
                )}
                aria-hidden="true"
              />
              About
            </button>
          </li>
          <li>
            <button
              className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
              onClick={async () => {
                if (streamDeckConnected) return;
                try {
                  await connectToStreamDeck(
                    streamDeckButtonSets[activeButtonSet],
                    handleNextButtonSet
                  );
                  setStreamDeckConnected(true);
                } catch (error) {
                  console.error('Failed to connect to Stream Deck:', error);
                }
              }}
            >
              <StreamDeckIcon
                className={classNames(
                  'text-gray-400 group-hover:text-indigo-600',
                  'h-6 w-6 shrink-0'
                )}
                aria-hidden="true"
              />
              {streamDeckConnected
                ? 'Stream Deck connected'
                : 'Connect to Stream Deck'}
            </button>
          </li>
        </ul>
      </SideMenu>
      <Modal
        open={currentModal === 'about'}
        setOpen={() => setCurrentModal(null)}
        title="About PlayOverlay"
        icon="playoverlay-logo"
      >
        <div className="mt-6 border-t border-gray-100">
          <dl className="divide-y divide-gray-100">
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">
                Product
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                PlayOverlay
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">
                Version
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {window?.electronAPI?.getVersion()}
              </dd>
            </div>
          </dl>
        </div>
      </Modal>
    </>
  );
}
