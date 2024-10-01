import { AppSettings, MatchState } from 'src/types';
import SideMenu from '../SideMenu/SideMenu';
import TeamSettings from './TeamSettings';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import { MatchSettings } from 'src/zodSchemas';
import SavedMatchSettings from './SavedMatchSettings';

export interface Props {
  sidebarOpen: boolean;
  setSidebarOpen: (sidebarOpen: boolean) => void;
  matchSettings: MatchSettings;
  updateMatchSettings: (updatedSettings: Partial<MatchSettings>) => void;
  appSettings: AppSettings;
  isDemoMode: boolean;
}

export default function MatchSettingsMenu({
  sidebarOpen,
  setSidebarOpen,
  matchSettings,
  updateMatchSettings,
  appSettings,
  isDemoMode,
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
        appSettings={appSettings}
        disabled={isDemoMode}
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
                  updateMatchSettings({ halfLength: Number(e.target.value) })
                }
              />
            </div>
          </div>
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
                    extraTimeHalfLength: Number(e.target.value || 0),
                  })
                }
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => {
            updateMatchSettings({ halfLength: 45, extraTimeHalfLength: 15 });
          }}
        >
          Reset
        </button>
      </CollapsiblePanel>
    </SideMenu>
  );
}
