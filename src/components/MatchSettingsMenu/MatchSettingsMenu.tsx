import { Switch } from '@headlessui/react';
import { AppSettings } from 'src/types';
import SideMenu from '../SideMenu/SideMenu';
import TeamSettings from './TeamSettings';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import { MatchSettings } from 'src/zodSchemas';
import SavedMatchSettings from './SavedMatchSettings';
import { classNames } from '../../utils';

// Parses a numeric timer-input's raw string value; returns undefined (so the
// engine falls back to its default) for anything that isn't a finite
// positive number, rather than persisting 0/NaN/negative values.
function parsePositiveNumberInput(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

// Same as parsePositiveNumberInput, but additionally rejects fractional
// values — used for periodCount, which must be a whole number of periods.
function parsePositiveIntegerInput(value: string): number | undefined {
  const parsed = parsePositiveNumberInput(value);
  return parsed !== undefined && Number.isInteger(parsed) ? parsed : undefined;
}

export interface Props {
  sidebarOpen: boolean;
  setSidebarOpen: (sidebarOpen: boolean) => void;
  matchSettings: MatchSettings;
  updateMatchSettings: (updatedSettings: Partial<MatchSettings>) => void;
  appSettings: AppSettings;
}

export default function MatchSettingsMenu({
  sidebarOpen,
  setSidebarOpen,
  matchSettings,
  updateMatchSettings,
  appSettings,
}: Props) {
  return (
    <SideMenu
      title="Match Settings"
      open={sidebarOpen}
      setOpen={setSidebarOpen}
    >
      <SavedMatchSettings
        matchSettings={matchSettings}
        setMatchSettings={updateMatchSettings}
      />
      <TeamSettings
        title="Home Team"
        teamNameFull={matchSettings.homeTeamNameFull}
        setTeamNameFull={(homeTeamNameFull: string) =>
          updateMatchSettings({ homeTeamNameFull })
        }
        teamNameAbbreviated={matchSettings.homeTeamNameAbbreviated}
        setTeamNameAbbreviated={(homeTeamNameAbbreviated: string) =>
          updateMatchSettings({ homeTeamNameAbbreviated })
        }
        textColour={matchSettings.homeTeamTextColour}
        setTextColour={(homeTeamTextColour: string) =>
          updateMatchSettings({ homeTeamTextColour })
        }
        backgroundColour={matchSettings.homeTeamBackgroundColour}
        setBackgroundColour={(homeTeamBackgroundColour: string) =>
          updateMatchSettings({ homeTeamBackgroundColour })
        }
        teamLogo={matchSettings.homeTeamLogo}
        setTeamLogo={(homeTeamLogo: string | undefined) =>
          updateMatchSettings({ homeTeamLogo })
        }
        appSettings={appSettings}
      />
      <TeamSettings
        title="Away Team"
        teamNameFull={matchSettings.awayTeamNameFull}
        setTeamNameFull={(awayTeamNameFull: string) =>
          updateMatchSettings({ awayTeamNameFull })
        }
        teamNameAbbreviated={matchSettings.awayTeamNameAbbreviated}
        setTeamNameAbbreviated={(awayTeamNameAbbreviated: string) =>
          updateMatchSettings({ awayTeamNameAbbreviated })
        }
        textColour={matchSettings.awayTeamTextColour}
        setTextColour={(awayTeamTextColour: string) =>
          updateMatchSettings({ awayTeamTextColour })
        }
        backgroundColour={matchSettings.awayTeamBackgroundColour}
        setBackgroundColour={(awayTeamBackgroundColour: string) =>
          updateMatchSettings({ awayTeamBackgroundColour })
        }
        teamLogo={matchSettings.awayTeamLogo}
        setTeamLogo={(awayTeamLogo: string | undefined) =>
          updateMatchSettings({ awayTeamLogo })
        }
        appSettings={appSettings}
      />
      <CollapsiblePanel title="Match Details">
        <div className="col-span-full mb-4">
          <label
            htmlFor="matchVenue"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Venue
          </label>
          <div className="mt-2">
            <input
              type="text"
              name="matchVenue"
              id="matchVenue"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700 sm:text-sm sm:leading-6"
              onChange={(e) => {
                updateMatchSettings({ venue: e.target.value || undefined });
              }}
              value={matchSettings.venue || ''}
            />
          </div>
        </div>
        <div className="col-span-full mb-4">
          <label
            htmlFor="kickOffTime"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Kick-off Time
          </label>
          <div className="mt-2">
            <input
              type="time"
              name="kickOffTime"
              id="kickOffTime"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              onChange={(e) => {
                updateMatchSettings({
                  kickOffTime: e.target.value || undefined,
                });
              }}
              value={matchSettings.kickOffTime || ''}
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium leading-6 text-gray-900">
            Timer Mode
          </label>
          <ButtonGrid
            compact
            buttons={[
              {
                label: 'Football',
                selected: matchSettings.timerMode !== 'generic',
                onClick: () => updateMatchSettings({ timerMode: 'football' }),
              },
              {
                label: 'Generic',
                selected: matchSettings.timerMode === 'generic',
                onClick: () => updateMatchSettings({ timerMode: 'generic' }),
              },
            ]}
          />
        </div>
        {matchSettings.timerMode === 'generic' ? (
          <div className="mb-4 grid grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="periodCount"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Number of Periods
              </label>
              <div className="mt-2">
                <input
                  type="number"
                  name="periodCount"
                  id="periodCount"
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={matchSettings.periodCount ?? 4}
                  onChange={(e) =>
                    updateMatchSettings({
                      periodCount: parsePositiveIntegerInput(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="periodLength"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Period Length
              </label>
              <div className="mt-2">
                <input
                  type="number"
                  name="periodLength"
                  id="periodLength"
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={matchSettings.periodLength ?? 10}
                  onChange={(e) =>
                    updateMatchSettings({
                      periodLength: parsePositiveNumberInput(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="periodName"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Period Name
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  name="periodName"
                  id="periodName"
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={matchSettings.periodName || ''}
                  placeholder="Period"
                  onChange={(e) =>
                    updateMatchSettings({
                      periodName: e.target.value || undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="halfLength"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Half Length
              </label>
              <div className="mt-2">
                <input
                  type="number"
                  name="halfLength"
                  id="halfLength"
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={matchSettings.halfLength || ''}
                  onChange={(e) =>
                    updateMatchSettings({
                      halfLength: parsePositiveNumberInput(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            {matchSettings.hasExtraTime !== false && (
              <div>
                <label
                  htmlFor="extraTimeHalfLength"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Extra Time Half Length
                </label>
                <div className="mt-2">
                  <input
                    type="number"
                    name="extraTimeHalfLength"
                    id="extraTimeHalfLength"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={matchSettings.extraTimeHalfLength || ''}
                    onChange={(e) =>
                      updateMatchSettings({
                        extraTimeHalfLength: parsePositiveNumberInput(
                          e.target.value
                        ),
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}
        {matchSettings.timerMode !== 'generic' && (
          <Switch.Group as="div" className="mb-4 flex items-center">
            <Switch
              checked={matchSettings.hasExtraTime !== false}
              onChange={(hasExtraTime: boolean) =>
                updateMatchSettings({ hasExtraTime })
              }
              className={classNames(
                matchSettings.hasExtraTime !== false
                  ? 'bg-indigo-600'
                  : 'bg-gray-200',
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2'
              )}
            >
              <span
                aria-hidden="true"
                className={classNames(
                  matchSettings.hasExtraTime !== false
                    ? 'translate-x-5'
                    : 'translate-x-0',
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                )}
              />
            </Switch>
            <Switch.Label as="span" className="ml-3 text-sm">
              <span className="font-medium text-gray-900">Extra time</span>
            </Switch.Label>
          </Switch.Group>
        )}
        <Switch.Group as="div" className="mb-4 flex items-center">
          <Switch
            checked={matchSettings.hasPenalties !== false}
            onChange={(hasPenalties: boolean) =>
              updateMatchSettings({ hasPenalties })
            }
            className={classNames(
              matchSettings.hasPenalties !== false
                ? 'bg-indigo-600'
                : 'bg-gray-200',
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2'
            )}
          >
            <span
              aria-hidden="true"
              className={classNames(
                matchSettings.hasPenalties !== false
                  ? 'translate-x-5'
                  : 'translate-x-0',
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
              )}
            />
          </Switch>
          <Switch.Label as="span" className="ml-3 text-sm">
            <span className="font-medium text-gray-900">Penalties</span>
          </Switch.Label>
        </Switch.Group>
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => {
            updateMatchSettings({
              timerMode: 'football',
              halfLength: 45,
              extraTimeHalfLength: 15,
              hasExtraTime: true,
              hasPenalties: true,
              periodCount: undefined,
              periodLength: undefined,
              periodName: undefined,
            });
          }}
        >
          Reset
        </button>
      </CollapsiblePanel>
    </SideMenu>
  );
}
