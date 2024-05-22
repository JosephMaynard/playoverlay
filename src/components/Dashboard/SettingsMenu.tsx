import { AppSettings, TeamSettingsInterface } from 'src/types';
import SideMenu from '../SideMenu/SideMenu';
import TeamSettings from './TeamSettings';

export interface Props {
  sidebarOpen: boolean;
  setSidebarOpen: (sidebarOpen: boolean) => void;
  teamSettings: TeamSettingsInterface;
  updateTeamSettings: (updatedSettings: Partial<TeamSettingsInterface>) => void;
  appSettings: AppSettings;
  isDemoMode: boolean;
}

export default function SettingsMenu({
  sidebarOpen,
  setSidebarOpen,
  teamSettings,
  updateTeamSettings,
  appSettings,
  isDemoMode,
}: Props) {
  return (
    <SideMenu title="Team Settings" open={sidebarOpen} setOpen={setSidebarOpen}>
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
    </SideMenu>
  );
}
