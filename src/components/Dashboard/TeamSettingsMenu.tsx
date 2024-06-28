import { AppSettings, MatchSettings, TeamSettingsInterface } from 'src/types';
import SideMenu from '../SideMenu/SideMenu';
import TeamSettings from './TeamSettings';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';

export interface Props {
  sidebarOpen: boolean;
  setSidebarOpen: (sidebarOpen: boolean) => void;
  teamSettings: TeamSettingsInterface;
  updateTeamSettings: (updatedSettings: Partial<TeamSettingsInterface>) => void;
  appSettings: AppSettings;
  isDemoMode: boolean;
  matchSettings: MatchSettings;
  updateMatchSettings: (settingsUpdated: Partial<MatchSettings>) => void;
}

export default function TeamSettingsMenu({
  sidebarOpen,
  setSidebarOpen,
  teamSettings,
  updateTeamSettings,
  appSettings,
  isDemoMode,
  matchSettings,
  updateMatchSettings,
}: Props) {
  return (
    <SideMenu
      title="Match Settings"
      open={sidebarOpen}
      setOpen={setSidebarOpen}
    >
      <TeamSettings
        title="Home Team"
        teamNameFull={teamSettings.homeTeamNameFull}
        setTeamNameFull={(homeTeamNameFull: string) =>
          updateTeamSettings({ homeTeamNameFull })
        }
        teamNameAbbreviated={teamSettings.homeTeamNameAbbreviated}
        setTeamNameAbbreviated={(homeTeamNameAbbreviated: string) =>
          updateTeamSettings({ homeTeamNameAbbreviated })
        }
        textColour={teamSettings.homeTeamTextColour}
        setTextColour={(homeTeamTextColour: string) =>
          updateTeamSettings({ homeTeamTextColour })
        }
        backgroundColour={teamSettings.homeTeamBackgroundColour}
        setBackgroundColour={(homeTeamBackgroundColour: string) =>
          updateTeamSettings({ homeTeamBackgroundColour })
        }
        appSettings={appSettings}
      />
      <TeamSettings
        title="Away Team"
        teamNameFull={teamSettings.awayTeamNameFull}
        setTeamNameFull={(awayTeamNameFull: string) =>
          updateTeamSettings({ awayTeamNameFull })
        }
        teamNameAbbreviated={teamSettings.awayTeamNameAbbreviated}
        setTeamNameAbbreviated={(awayTeamNameAbbreviated: string) =>
          updateTeamSettings({ awayTeamNameAbbreviated })
        }
        textColour={teamSettings.awayTeamTextColour}
        setTextColour={(awayTeamTextColour: string) =>
          updateTeamSettings({ awayTeamTextColour })
        }
        backgroundColour={teamSettings.awayTeamBackgroundColour}
        setBackgroundColour={(awayTeamBackgroundColour: string) =>
          updateTeamSettings({ awayTeamBackgroundColour })
        }
        appSettings={appSettings}
        disabled={isDemoMode}
      />
      <CollapsiblePanel title="Match Length">
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
                value={matchSettings.halfLength}
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
                value={matchSettings.extraTimeHalfLength}
                onChange={(e) =>
                  updateMatchSettings({
                    extraTimeHalfLength: Number(e.target.value),
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
