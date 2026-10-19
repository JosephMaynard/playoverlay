import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  classNames,
  homeOrAway,
  lineupAfterSubstitutions,
  MatchSettings,
  Player,
  Substitution,
  teamPlayers,
} from '@playoverlay/core';
import './LineupLayout.css';

export interface Props {
  team: homeOrAway;
  matchSettings: MatchSettings;
  // The match's substitution log (both teams'); the screen works out who is
  // on the pitch from it. Optional so a host without substitutions renders
  // the squad as entered.
  substitutions?: Substitution[];
  active: boolean;
}

const NO_SUBSTITUTIONS: Substitution[] = [];

// Up to this many players fit one column; more are split over two.
const ONE_COLUMN_MAX = 11;

// One player: the shirt number in the team's colours (a blank cell when
// there is none, so the names still line up), then the name on black.
function PlayerRow({
  player,
  textColour,
  backgroundColour,
}: {
  player: Player;
  textColour?: string;
  backgroundColour?: string;
}) {
  return (
    <li className="LineupLayout_row flex">
      <span
        className="LineupLayout_number text-center font-bold"
        style={{ color: textColour, backgroundColor: backgroundColour }}
      >
        {player.number}
      </span>
      <span className="LineupLayout_name truncate bg-black text-white">
        {player.name}
      </span>
    </li>
  );
}

// A team's line-up on air: logo, full name and colour stripe over the
// players on the pitch in the order they were entered, in one column for up
// to eleven and two balanced columns beyond that (the left one takes the odd
// player). A squad with a bench, or with substitutions made, gets a smaller
// "Bench" group underneath; a player substituted off simply joins it. Shows
// nothing for a team without players; the dashboard never offers the screen
// then anyway.
export default function LineupLayout({
  team,
  matchSettings,
  substitutions = NO_SUBSTITUTIONS,
  active,
}: Props) {
  const { t } = useTranslation();
  // The hidden animation starts from the fully-shown position, so it must
  // not play on first mount (display window load / OBS browser-source
  // reload would flash the layout on screen); only animate out after the
  // layout has actually been shown. Same pattern as MatchTitleLayout.
  const [hasBeenActive, setHasBeenActive] = useState(active);
  useEffect(() => {
    if (active) setHasBeenActive(true);
  }, [active]);

  if (teamPlayers(matchSettings, team).length === 0) return null;
  const { onPitch: players, bench } = lineupAfterSubstitutions(
    matchSettings,
    team,
    substitutions
  );

  const isHome = team === 'home';
  const name = isHome
    ? matchSettings.homeTeamNameFull
    : matchSettings.awayTeamNameFull;
  const logo = isHome ? matchSettings.homeTeamLogo : matchSettings.awayTeamLogo;
  const textColour = isHome
    ? matchSettings.homeTeamTextColour
    : matchSettings.awayTeamTextColour;
  const backgroundColour = isHome
    ? matchSettings.homeTeamBackgroundColour
    : matchSettings.awayTeamBackgroundColour;

  const twoColumns = players.length > ONE_COLUMN_MAX;
  const leftCount = twoColumns ? Math.ceil(players.length / 2) : players.length;
  const columns = twoColumns
    ? [players.slice(0, leftCount), players.slice(leftCount)]
    : [players];

  return (
    <div
      className={`LineupLayout ${
        active
          ? 'LineupLayout_active'
          : hasBeenActive
            ? 'LineupLayout_hidden'
            : ''
      } absolute left-0 top-0 h-full w-full`}
    >
      <div
        className={classNames(
          'LineupLayout_board',
          twoColumns ? 'LineupLayout_board_twoColumns' : '',
          leftCount > ONE_COLUMN_MAX ? 'LineupLayout_dense' : ''
        )}
      >
        <div className="LineupLayout_header flex items-center bg-black text-white">
          {logo && (
            <div className="LineupLayout_logo">
              <img src={logo} alt="" className="h-full w-full object-contain" />
            </div>
          )}
          <div className="LineupLayout_teamName truncate font-bold">{name}</div>
        </div>
        <div
          className="LineupLayout_teamColour"
          style={{ backgroundColor: backgroundColour }}
        />
        <div className="LineupLayout_columns">
          {columns.map((column, index) => (
            <ol key={index} className="LineupLayout_column">
              {column.map((player, row) => (
                <PlayerRow
                  key={`${player.number ?? ''}-${player.name}-${row}`}
                  player={player}
                  textColour={textColour}
                  backgroundColour={backgroundColour}
                />
              ))}
            </ol>
          ))}
        </div>
        {bench.length > 0 && (
          <div className="LineupLayout_bench">
            <div className="LineupLayout_benchTitle font-bold uppercase">
              {t('screens:lineup.bench')}
            </div>
            <ol className="LineupLayout_benchList">
              {bench.map((player, row) => (
                <PlayerRow
                  key={`${player.number ?? ''}-${player.name}-${row}`}
                  player={player}
                  textColour={textColour}
                  backgroundColour={backgroundColour}
                />
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
