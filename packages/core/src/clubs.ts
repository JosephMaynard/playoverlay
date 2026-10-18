import { Club, homeOrAway } from './types';
import { MatchSettings } from './zodSchemas';

// Pure helpers for Club presets: the mapping between a saved club and the
// home/away fields of the match settings, and how the saved list is kept.

type TeamFields = Pick<
  MatchSettings,
  | 'homeTeamNameFull'
  | 'homeTeamNameAbbreviated'
  | 'homeTeamTextColour'
  | 'homeTeamBackgroundColour'
  | 'homeTeamLogo'
  | 'awayTeamNameFull'
  | 'awayTeamNameAbbreviated'
  | 'awayTeamTextColour'
  | 'awayTeamBackgroundColour'
  | 'awayTeamLogo'
>;

// The match-settings update that puts a club into the home or away slot.
// Every field is set, the logo included (as undefined when the club has
// none), so no detail of the previous team survives the swap.
export function teamFieldsFromClub(
  club: Club,
  team: homeOrAway
): Partial<TeamFields> {
  if (team === 'home') {
    return {
      homeTeamNameFull: club.name,
      homeTeamNameAbbreviated: club.abbreviation,
      homeTeamTextColour: club.textColour,
      homeTeamBackgroundColour: club.backgroundColour,
      homeTeamLogo: club.logo,
    };
  }
  return {
    awayTeamNameFull: club.name,
    awayTeamNameAbbreviated: club.abbreviation,
    awayTeamTextColour: club.textColour,
    awayTeamBackgroundColour: club.backgroundColour,
    awayTeamLogo: club.logo,
  };
}

// A club made from whatever is currently in the home or away slot. Colours
// fall back to white on black, the same as an unset team renders.
export function clubFromTeam(
  id: string,
  matchSettings: MatchSettings,
  team: homeOrAway
): Club {
  const isHome = team === 'home';
  return {
    id,
    name: (isHome
      ? matchSettings.homeTeamNameFull
      : matchSettings.awayTeamNameFull
    ).trim(),
    abbreviation: isHome
      ? matchSettings.homeTeamNameAbbreviated
      : matchSettings.awayTeamNameAbbreviated,
    textColour:
      (isHome
        ? matchSettings.homeTeamTextColour
        : matchSettings.awayTeamTextColour) ?? '#ffffff',
    backgroundColour:
      (isHome
        ? matchSettings.homeTeamBackgroundColour
        : matchSettings.awayTeamBackgroundColour) ?? '#000000',
    logo: isHome ? matchSettings.homeTeamLogo : matchSettings.awayTeamLogo,
  };
}

// Saving a club whose name is already in the list (ignoring case and
// surrounding spaces) updates that entry, keeping its id, rather than
// adding a near-duplicate; a club's colours or logo change over time. The
// list is kept in name order for the picker.
export function upsertClub(clubs: Club[], club: Club): Club[] {
  const key = club.name.trim().toLocaleLowerCase();
  const existing = clubs.find(
    (entry) => entry.name.trim().toLocaleLowerCase() === key
  );
  const next = existing
    ? clubs.map((entry) =>
        entry === existing ? { ...club, id: existing.id } : entry
      )
    : [...clubs, club];
  return [...next].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
  );
}
